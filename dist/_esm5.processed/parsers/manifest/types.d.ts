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
import { IRepresentationIndex } from "../../manifest";
export interface IContentProtectionKID {
    keyId: Uint8Array;
    systemId?: string;
}
export interface IContentProtectionPSSH {
    systemId: string;
    data: Uint8Array;
}
export interface IContentProtections {
    keyIds: IContentProtectionKID[];
    pssh: IContentProtectionPSSH[];
}
export interface IParsedRepresentation {
    bitrate: number;
    index: IRepresentationIndex;
    id: string;
    codecs?: string;
    contentProtections?: IContentProtections;
    frameRate?: string;
    height?: number;
    mimeType?: string;
    width?: number;
}
export declare type IParsedAdaptations = Partial<Record<string, IParsedAdaptation[]>>;
export interface IParsedAdaptation {
    id: string;
    representations: IParsedRepresentation[];
    type: string;
    audioDescription?: boolean;
    closedCaption?: boolean;
    language?: string;
}
export interface IParsedPeriod {
    id: string;
    start: number;
    adaptations: IParsedAdaptations;
    duration?: number;
    end?: number;
}
export interface IParsedManifest {
    id: string;
    isLive: boolean;
    periods: IParsedPeriod[];
    transportType: string;
    availabilityStartTime?: number;
    baseURL?: string;
    clockOffset?: number;
    duration?: number;
    lifetime?: number;
    maximumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    minimumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    suggestedPresentationDelay?: number;
    uris?: string[];
}
