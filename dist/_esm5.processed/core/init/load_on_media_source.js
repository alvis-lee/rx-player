/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { EMPTY, merge as observableMerge, of as observableOf, Subject, } from "rxjs";
import { filter, finalize, ignoreElements, map, mergeMap, takeUntil, tap, } from "rxjs/operators";
import { MediaError } from "../../errors";
import log from "../../log";
import BufferOrchestrator from "../buffers";
import SourceBuffersStore from "../source_buffers";
import createBufferClock from "./create_buffer_clock";
import { setDurationToMediaSource } from "./create_media_source";
import { maintainEndOfStream } from "./end_of_stream";
import EVENTS from "./events_generators";
import getDiscontinuities from "./get_discontinuities";
import getStalledEvents from "./get_stalled_events";
import handleDiscontinuity from "./handle_discontinuity";
import seekAndLoadOnMediaEvents from "./initial_seek_and_play";
import updatePlaybackRate from "./update_playback_rate";
/**
 * Returns a function allowing to load or reload the content in arguments into
 * a single or multiple MediaSources.
 * @param {Object} args
 * @returns {Observable}
 */
export default function createMediaSourceLoader(_a) {
    var mediaElement = _a.mediaElement, manifest = _a.manifest, clock$ = _a.clock$, speed$ = _a.speed$, bufferOptions = _a.bufferOptions, abrManager = _a.abrManager, segmentPipelinesManager = _a.segmentPipelinesManager;
    /**
     * Load the content on the given MediaSource.
     * @param {MediaSource} mediaSource
     * @param {number} initialTime
     * @param {boolean} autoPlay
     */
    return function loadContentOnMediaSource(mediaSource, initialTime, autoPlay) {
        // TODO Update the duration if it evolves?
        var duration = manifest.getDuration();
        setDurationToMediaSource(mediaSource, duration == null ? Infinity :
            duration);
        var initialPeriod = manifest.getPeriodForTime(initialTime);
        if (initialPeriod == null) {
            throw new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", "Wanted starting time not found in the Manifest.");
        }
        // Creates SourceBuffersStore allowing to create and keep track of a
        // single SourceBuffer per type.
        var sourceBuffersStore = new SourceBuffersStore(mediaElement, mediaSource);
        // Initialize all native source buffers from the first period at the same
        // time.
        // We cannot lazily create native sourcebuffers since the spec does not
        // allow adding them during playback.
        //
        // From https://w3c.github.io/media-source/#methods
        //    For example, a user agent may throw a QuotaExceededError
        //    exception if the media element has reached the HAVE_METADATA
        //    readyState. This can occur if the user agent's media engine
        //    does not support adding more tracks during playback.
        createNativeSourceBuffersForPeriod(sourceBuffersStore, initialPeriod);
        var _a = seekAndLoadOnMediaEvents(clock$, mediaElement, initialTime, autoPlay), seek$ = _a.seek$, load$ = _a.load$;
        var initialPlay$ = load$.pipe(filter(function (evt) { return evt !== "not-loaded-metadata"; }));
        var bufferClock$ = createBufferClock(clock$, { autoPlay: autoPlay,
            initialPlay$: initialPlay$,
            initialSeek$: seek$,
            manifest: manifest,
            speed$: speed$,
            startTime: initialTime });
        // Will be used to cancel any endOfStream tries when the contents resume
        var cancelEndOfStream$ = new Subject();
        // Creates Observable which will manage every Buffer for the given Content.
        var buffers$ = BufferOrchestrator({ manifest: manifest, initialPeriod: initialPeriod }, bufferClock$, abrManager, sourceBuffersStore, segmentPipelinesManager, bufferOptions).pipe(mergeMap(function (evt) {
            switch (evt.type) {
                case "end-of-stream":
                    log.debug("Init: end-of-stream order received.");
                    return maintainEndOfStream(mediaSource).pipe(ignoreElements(), takeUntil(cancelEndOfStream$));
                case "resume-stream":
                    log.debug("Init: resume-stream order received.");
                    cancelEndOfStream$.next(null);
                    return EMPTY;
                case "discontinuity-encountered":
                    var _a = evt.value, bufferType = _a.bufferType, gap = _a.gap;
                    if (SourceBuffersStore.isNative(bufferType)) {
                        handleDiscontinuity(gap[1], mediaElement);
                    }
                    return EMPTY;
                case "needs-nudging-seek":
                    var currentTime = mediaElement.currentTime;
                    if (currentTime + 0.001 < mediaElement.duration) {
                        mediaElement.currentTime += 0.001;
                    }
                    else {
                        mediaElement.currentTime = currentTime;
                    }
                default:
                    return observableOf(evt);
            }
        }));
        // update the speed set by the user on the media element while pausing a
        // little longer while the buffer is empty.
        var playbackRate$ = updatePlaybackRate(mediaElement, speed$, clock$, { pauseWhenStalled: true })
            .pipe(map(EVENTS.speedChanged));
        // Create Stalling Manager, an observable which will try to get out of
        // various infinite stalling issues
        var stalled$ = getStalledEvents(clock$)
            .pipe(map(EVENTS.stalled));
        var handledDiscontinuities$ = getDiscontinuities(clock$, manifest).pipe(tap(function (gap) {
            var seekTo = gap[1];
            handleDiscontinuity(seekTo, mediaElement);
        }), ignoreElements());
        var loadedEvent$ = load$
            .pipe(mergeMap(function (evt) {
            if (evt === "autoplay-blocked") {
                var error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY", "Cannot trigger auto-play automatically: " +
                    "your browser does not allow it.");
                return observableOf(EVENTS.warning(error), EVENTS.loaded(sourceBuffersStore));
            }
            else if (evt === "not-loaded-metadata") {
                var error = new MediaError("MEDIA_ERR_NOT_LOADED_METADATA", "Cannot load automatically: your browser " +
                    "falsely announced having loaded the content.");
                return observableOf(EVENTS.warning(error));
            }
            log.debug("Init: The current content is loaded.");
            return observableOf(EVENTS.loaded(sourceBuffersStore));
        }));
        return observableMerge(handledDiscontinuities$, loadedEvent$, playbackRate$, stalled$, buffers$).pipe(finalize(function () {
            // clean-up every created SourceBuffers
            sourceBuffersStore.disposeAll();
        }));
    };
}
/**
 * Create all native SourceBuffers needed for a given Period.
 *
 * Native Buffers have the particulary to need to be created at the beginning of
 * the content.
 * Custom source buffers (entirely managed in JS) can generally be created and
 * disposed at will during the lifecycle of the content.
 * @param {SourceBuffersStore} sourceBuffersStore
 * @param {Period} period
 */
function createNativeSourceBuffersForPeriod(sourceBuffersStore, period) {
    Object.keys(period.adaptations).forEach(function (bufferType) {
        if (SourceBuffersStore.isNative(bufferType)) {
            var adaptations = period.adaptations[bufferType];
            var representations = adaptations != null &&
                adaptations.length > 0 ? adaptations[0].representations :
                [];
            if (representations.length > 0) {
                var codec = representations[0].getMimeTypeString();
                sourceBuffersStore.createSourceBuffer(bufferType, codec);
            }
        }
    });
}
