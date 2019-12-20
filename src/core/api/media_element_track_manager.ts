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

import {
  BehaviorSubject,
  Observable,
} from "rxjs";
import log from "../../log";
import normalizeLanguage from "../../utils/languages";
import {
  IAudioTrackPreference,
  ITextTrackPreference,
} from "./track_manager";

export interface ITMTrack { language : string;
                          normalized : string;
                          id : number|string; }

export interface ITMTrackListItem
  extends ITMTrack { active : boolean; }

export interface ICustomTextTrack extends TextTrack { id: string; }

function getTrackId(id: string, language: string): string {
  return id === "" ? language + "_id" : id;
}

/**
 * Manage video, audio and text tracks for current direct file content.
 * @class MediaElementTrackManager
 */
export default class MediaElementTrackManager {
  // Array of preferred languages for audio tracks.
  // Sorted by order of preference descending.
  private _preferredAudioTracks : BehaviorSubject<IAudioTrackPreference[]>;

  // Array of preferred languages for text tracks.
  // Sorted by order of preference descending.
  private _preferredTextTracks : BehaviorSubject<ITextTrackPreference[]>;

  private _audioTracks? : AudioTrackList;
  private _textTracks? : TextTrackList;
  private _videoTracks? : VideoTrackList;

  constructor(
    defaults : { preferredAudioTracks : BehaviorSubject<IAudioTrackPreference[]>;
                 preferredTextTracks : BehaviorSubject<ITextTrackPreference[]>; },
    mediaElement: HTMLMediaElement
  ) {
    const { preferredAudioTracks, preferredTextTracks } = defaults;

    this._preferredAudioTracks = preferredAudioTracks;
    this._preferredTextTracks = preferredTextTracks;

    this._audioTracks = mediaElement.audioTracks;
    this._textTracks = mediaElement.textTracks;
    this._videoTracks = mediaElement.videoTracks;
  }

  public onTrackChange$(): Observable<{ type: string; track: ITMTrack|null }> {
    return new Observable((obs) => {
      const audioCallback = () => {
        if (this._audioTracks !== undefined) {
          for (let i = 0; i < this._audioTracks.length; i++) {
            const track = this._audioTracks[i];
            if (track.enabled) {
              const { language, id } = track;
              const formattedTrack = { language,
                                       id: getTrackId(id, language),
                                       normalized: normalizeLanguage(language) };
              return obs.next({
                type: "audio",
                track: formattedTrack,
              });
            }
          }
        }
        return obs.next({ type: "audio", track: null });
      };
      const textCallback = () => {
        if (this._textTracks !== undefined) {
          for (let i = 0; i < this._textTracks.length; i++) {
            const track = this._textTracks[i] as ICustomTextTrack;
            if (track.mode === "showing") {
              const { language, id } = track;
              const formattedTrack = { language,
                                       id: getTrackId(id, language),
                                       normalized: normalizeLanguage(language) };
              return obs.next({
                type: "text",
                track: formattedTrack,
              });
            }
          }
        }
        return obs.next({ type: "text", track: null });
      };
      const videoCallback = () => {
        if (this._videoTracks !== undefined) {
          for (let i = 0; i < this._videoTracks.length; i++) {
            const track = this._videoTracks[i];
            if (track.selected) {
              const { language, id } = track;
              const formattedTrack = { language,
                                       id: getTrackId(id, language),
                                       normalized: normalizeLanguage(language) };
              obs.next({
                type: "video",
                track: formattedTrack,
              });
            }
          }
        }
        return obs.next({ type: "video", track: null });
      };
      this._audioTracks?.addEventListener("change", audioCallback);
      this._videoTracks?.addEventListener("change", videoCallback);
      this._textTracks?.addEventListener("change", textCallback);
      return () => {
        this._audioTracks?.removeEventListener("change", audioCallback);
        this._videoTracks?.removeEventListener("change", videoCallback);
        this._textTracks?.removeEventListener("change", textCallback);
      };
    });
  }

  public setInitialAudioTrack() : void {
    const preferredAudioTracks = this._preferredAudioTracks.getValue();
    const id = this._findFirstOptimalAudioTrackId(
      preferredAudioTracks
        .filter(
          (audioTrack): audioTrack is {
            language : string;
            audioDescription : boolean;
          } => audioTrack !== null)
        .map(({ language }) => normalizeLanguage(language))
    );
    if (id != null) {
      this.setAudioTrackById(id);
    }
  }

  public setInitialTextTrack() : void {
    const preferredTextTracks = this._preferredTextTracks.getValue();
    const id = this._findFirstOptimalTextTrackId(
      preferredTextTracks
        .filter(
          (textTrack): textTrack is { language : string;
                                      closedCaption : boolean; } => textTrack !== null)
        .map(({ language }) =>  normalizeLanguage(language))
    );
    if (id !== null) {
      this.setTextTrackById(id);
    }
  }

  public setAudioTrackById(id?: string): void {
    if (this._audioTracks === undefined) {
      log.warn("MediaElementTrackManager: no audio tracks on media element.");
      return;
    }
    for (let i = 0; i < this._audioTracks.length; i++) {
      const audioTrack = this._audioTracks[i];
      if (getTrackId(audioTrack.id, audioTrack.language) === id) {
        audioTrack.enabled = true;
      }
    }
  }

  public setTextTrackById(id?: string): void {
    if (this._textTracks === undefined) {
      log.warn("MediaElementTrackManager: no text tracks on media element.");
      return;
    }
    for (let i = 0; i < this._textTracks.length; i++) {

      // TODO Strange that ts doesn't implement the id attribute of
      // a text track, even if it is declared on w3c :
      // https://www.w3.org/TR/html52/semantics-embedded-content.html#texttrack
      const textTrack = this._textTracks[i] as ICustomTextTrack;
      if (getTrackId(textTrack.id, textTrack.language) === id) {
        textTrack.mode = "showing";
      } else if (textTrack.mode === "showing" || textTrack.mode === "hidden") {
        textTrack.mode = "disabled";
      }
    }
  }

  public setVideoTrackById(id?: string): void {
    if (this._videoTracks === undefined) {
      log.warn("MediaElementTrackManager: no video tracks on media element.");
      return;
    }
    for (let i = 0; i < this._videoTracks.length; i++) {
      const videoTrack = this._videoTracks[i];
      if (getTrackId(videoTrack.id, videoTrack.language) === id) {
        videoTrack.selected = true;
      }
    }
  }

  public getChosenAudioTrack(): ITMTrack|null|undefined {
    if (this._audioTracks === undefined) {
      log.warn("MediaElementTrackManager: no audio tracks on media element.");
      return undefined;
    }
    for (let i = 0; i < this._audioTracks.length; i++) {
      const audioTrack = this._audioTracks[i];
      if (audioTrack.enabled) {
        const { language, id } = audioTrack;
        return { language,
                 id: getTrackId(id, language),
                 normalized: normalizeLanguage(language) };
      }
    }
    return null;
  }

  public getChosenTextTrack(): ITMTrack|null|undefined {
    if (this._textTracks === undefined) {
      log.warn("MediaElementTrackManager: no text tracks on media element.");
      return undefined;
    }
    for (let i = 0; i < this._textTracks.length; i++) {
      const textTrack = this._textTracks[i] as ICustomTextTrack;
      if (textTrack.mode === "showing") {
        const { language, id } = textTrack;
        return { language,
                 id: getTrackId(id, language),
                 normalized: normalizeLanguage(language) };
      }
    }
    return null;
  }

  public getChosenVideoTrack(): ITMTrack|null|undefined {
    if (this._videoTracks === undefined) {
      log.warn("MediaElementTrackManager: no video tracks on media element.");
      return undefined;
    }
    for (let i = 0; i < this._videoTracks.length; i++) {
      const videoTrack = this._videoTracks[i];
      if (videoTrack.selected) {
        const { language, id } = videoTrack;
        return { id: getTrackId(id, language),
                 language,
                 normalized: normalizeLanguage(language) };
      }
    }
    return null;
  }

  public getAvailableAudioTracks(): ITMTrackListItem[]|undefined {
    if (this._audioTracks === undefined) {
      log.warn("MediaElementTrackManager: no audio tracks on media element.");
      return undefined;
    }
    const formattedAudioTracks = [];
    for (let i = 0; i < this._audioTracks.length; i++) {
      const audioTrack = this._audioTracks[i];
      const { language, id, enabled } = audioTrack;
      formattedAudioTracks.push({ language,
                                  id: getTrackId(id, language),
                                  active: enabled,
                                  normalized: normalizeLanguage(language) });
    }
    return formattedAudioTracks;
  }

  public getAvailableTextTracks(): ITMTrackListItem[]|undefined {
    if (this._textTracks === undefined) {
      log.warn("MediaElementTrackManager: no text tracks on media element.");
      return undefined;
    }
    const formattedTextTracks = [];
    for (let i = 0; i < this._textTracks.length; i++) {
      const textTrack = this._textTracks[i];
      const { language, id, mode } = textTrack as ICustomTextTrack;
      formattedTextTracks.push({ language,
                                 id: getTrackId(id, language),
                                 active: mode === "showing",
                                 normalized: normalizeLanguage(language) });
    }
    return formattedTextTracks;
  }

  public getAvailableVideoTracks(): ITMTrackListItem[]|undefined {
    if (this._videoTracks === undefined) {
      log.warn("MediaElementTrackManager: no video tracks on media element.");
      return undefined;
    }
    const formattedVideoTracks = [];
    for (let i = 0; i < this._videoTracks.length; i++) {
      const videoTrack = this._videoTracks[i];
      const { language, id, selected } = videoTrack;
      formattedVideoTracks.push({ id: getTrackId(id, language),
                                  language,
                                  normalized: normalizeLanguage(language),
                                  active: selected });
    }
    return formattedVideoTracks;
  }

  private _findFirstOptimalAudioTrackId(
    normalizedLanguages: string[]
  ): string|null|undefined {
    if (this._audioTracks === undefined) {
      log.warn("MediaElementTrackManager: no audio tracks on media element.");
      return undefined;
    }
    for (let i = 0; i < normalizedLanguages.length; i++) {
      const language = normalizedLanguages[i];
      for (let j = 0; j < this._audioTracks.length; j++) {
        const audioTrack = this._audioTracks[j];
        const normalizedLanguage = normalizeLanguage(audioTrack.language);
        if (normalizedLanguage === language) {
          return getTrackId(audioTrack.id, audioTrack.language);
        }
      }
    }
    return null;
  }

  private _findFirstOptimalTextTrackId(
    normalizedLanguages: string[]
  ): string|null|undefined {
    if (this._textTracks === undefined) {
      log.warn("MediaElementTrackManager: no text tracks on media element.");
      return undefined;
    }
    for (let i = 0; i < normalizedLanguages.length; i++) {
      const language = normalizedLanguages[i];
      for (let j = 0; j < this._textTracks.length; j++) {
        const textTrack = this._textTracks[j] as ICustomTextTrack;
        const normalizedLanguage = normalizeLanguage(textTrack.language);
        if (normalizedLanguage === language) {
          return getTrackId(textTrack.id, textTrack.language);
        }
      }
    }
    return null;
  }
}
