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
import { Observable } from "rxjs";
import { ICustomMediaKeySession } from "./custom_media_keys";
/**
 * Some browsers have problems when the CENC PSSH box is the first managed PSSH
 * encountered (for the moment just Edge was noted with this behavior).
 *
 * This function tries to move CENC PSSH boxes at the end of the given init
 * data.
 *
 * If the initData is unrecognized or if a CENC PSSH is not found, this function
 * throws.
 * @param {Uint8Array} initData - Initialization data you want to patch
 * @returns {Uint8Array} - Initialization data, patched
 */
export declare function patchInitData(initData: Uint8Array): Uint8Array;
/**
 * Generate a request from session.
 * @param {MediaKeySession} session - MediaKeySession on which the request will
 * be done.
 * @param {Uint8Array} initData - Initialization data given e.g. by the
 * "encrypted" event for the corresponding request.
 * @param {string} initDataType - Initialization data type given e.g. by the
 * "encrypted" event for the corresponding request.
 * @param {string} sessionType - Type of session you want to generate. Consult
 * EME Specification for more information on session types.
 * @returns {Observable} - Emit when done. Errors if fails.
 */
export default function generateKeyRequest(session: MediaKeySession | ICustomMediaKeySession, initData: Uint8Array, initDataType: string | undefined): Observable<unknown>;
