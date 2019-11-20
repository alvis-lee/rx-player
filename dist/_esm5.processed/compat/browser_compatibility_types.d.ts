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
interface ICompatMediaKeysConstructor {
    isTypeSupported?: (type: string) => boolean;
    new (keyType?: string): MediaKeys;
}
declare type ICompatVTTCueConstructor = new (start: number, end: number, cueText: string) => ICompatVTTCue;
interface ICompatVTTCue {
    align: string;
    endTime: number;
    id: string;
    line: number | "auto";
    lineAlign: string;
    position: number | "auto";
    positionAlign: string;
    size: number | string;
    snapToLines: boolean;
    startTime: number;
    vertical: string;
}
interface ICompatTextTrack extends TextTrack {
    addCue(cue: TextTrackCue | ICompatVTTCue): void;
    removeCue(cue: TextTrackCue | ICompatVTTCue): void;
}
interface ICompatDocument extends Document {
    mozCancelFullScreen?: () => void;
    mozFullScreenElement?: HTMLElement;
    mozHidden?: boolean;
    msExitFullscreen?: () => void;
    webkitExitFullscreen: () => void;
    fullscreenElement: Element | null;
    msFullscreenElement?: Element | null;
    webkitFullscreenElement: Element | null;
    msHidden?: boolean;
    webkitHidden?: boolean;
}
interface ICompatHTMLMediaElement extends HTMLMediaElement {
    mozRequestFullScreen?: () => void;
    msRequestFullscreen?: () => void;
    webkitRequestFullscreen: () => void;
}
interface ICompatMediaKeySystemAccess extends MediaKeySystemAccess {
    getConfiguration(): ICompatMediaKeySystemConfiguration;
}
interface ICompatMediaKeySystemConfiguration {
    audioCapabilities?: MediaKeySystemMediaCapability[];
    distinctiveIdentifier?: MediaKeysRequirement;
    initDataTypes?: string[];
    persistentState?: MediaKeysRequirement;
    videoCapabilities?: MediaKeySystemMediaCapability[];
    sessionTypes?: string[];
}
export interface ICompatPictureInPictureWindow extends EventTarget {
    width: number;
    height: number;
}
declare const HTMLElement_: typeof HTMLElement;
declare const VTTCue_: ICompatVTTCueConstructor | undefined;
declare const MediaSource_: typeof MediaSource | undefined;
declare const MediaKeys_: ICompatMediaKeysConstructor | undefined;
declare const READY_STATES: {
    HAVE_NOTHING: number;
    HAVE_METADATA: number;
    HAVE_CURRENT_DATA: number;
    HAVE_FUTURE_DATA: number;
    HAVE_ENOUGH_DATA: number;
};
export { HTMLElement_, ICompatDocument, ICompatHTMLMediaElement, ICompatMediaKeySystemAccess, ICompatMediaKeySystemConfiguration, ICompatMediaKeysConstructor, ICompatTextTrack, ICompatVTTCue, ICompatVTTCueConstructor, MediaKeys_, MediaSource_, READY_STATES, VTTCue_, };
