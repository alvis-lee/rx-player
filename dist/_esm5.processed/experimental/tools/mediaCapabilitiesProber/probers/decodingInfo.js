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
import PPromise from "../../../../utils/promise";
import { ProberStatus, } from "../types";
/**
 * Check if the required APIs are available.
 * @returns {Promise}
 */
function isMediaCapabilitiesAPIAvailable() {
    return new PPromise(function (resolve) {
        if (!("mediaCapabilities" in navigator)) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "MediaCapabilities API not available");
        }
        /* tslint:disable no-unsafe-any */
        if (!("decodingInfo" in navigator.mediaCapabilities)) {
            /* tslint:enable no-unsafe-any */
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "Decoding Info not available");
        }
        resolve();
    });
}
/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeDecodingInfos(config) {
    return isMediaCapabilitiesAPIAvailable().then(function () {
        var hasVideoConfig = (config.type !== undefined && config.type.length > 0 &&
            config.video !== undefined &&
            config.video.bitrate !== undefined &&
            config.video.contentType !== undefined && config.video.contentType.length > 0 &&
            config.video.framerate !== undefined && config.video.framerate.length > 0 &&
            config.video.height !== undefined &&
            config.video.width !== undefined);
        var hasAudioConfig = (config.type !== undefined && config.type.length > 0 &&
            config.audio !== undefined &&
            config.audio.bitrate !== undefined &&
            config.audio.channels !== undefined && config.audio.channels.length > 0 &&
            config.audio.contentType !== undefined && config.audio.contentType.length > 0 &&
            config.audio.samplerate !== undefined);
        if (!hasVideoConfig && !hasAudioConfig) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "Not enough arguments for calling mediaCapabilites.");
        }
        /* tslint:disable no-unsafe-any */
        return navigator.mediaCapabilities.decodingInfo(config)
            /* tslint:enable no-unsafe-any */
            .then(function (result) {
            return [
                result.supported ? ProberStatus.Supported : ProberStatus.NotSupported,
            ];
        }).catch(function () {
            return [ProberStatus.NotSupported];
        });
    });
}
