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
import { IParsedPeriod } from "../types";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
export declare type IXLinkInfos = WeakMap<IPeriodIntermediateRepresentation, {
    url?: string;
    sendingTime?: number;
    receivedTime?: number;
}>;
export interface IManifestInfos {
    aggressiveMode: boolean;
    availabilityStartTime: number;
    baseURL?: string;
    clockOffset?: number;
    duration?: number;
    isDynamic: boolean;
    receivedTime?: number;
    timeShiftBufferDepth?: number;
    xlinkInfos: IXLinkInfos;
}
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parsePeriods(periodsIR: IPeriodIntermediateRepresentation[], manifestInfos: IManifestInfos): IParsedPeriod[];
