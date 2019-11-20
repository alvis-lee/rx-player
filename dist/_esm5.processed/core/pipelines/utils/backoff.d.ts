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
export interface IBackoffOptions {
    baseDelay: number;
    maxDelay: number;
    maxRetryRegular: number;
    maxRetryOffline: number;
}
export interface IBackoffRetry {
    type: "retry";
    value: unknown;
}
export interface IBackoffResponse<T> {
    type: "response";
    value: T;
}
export declare type IBackoffEvent<T> = IBackoffRetry | IBackoffResponse<T>;
/**
 * Specific exponential backoff algorithm used for segments/manifest
 * downloading.
 *
 * The specificty here in comparaison to a "regular" backoff algorithm is
 * the separation between type of errors:
 *   - "offline" errors
 *   - other xhr errors
 * Both have their own counters which are resetted if the error type changes.
 * @param {Observable} obs$
 * @param {Object} options - Configuration options.
 * @returns {Observable}
 */
export default function backoff<T>(obs$: Observable<T>, options: IBackoffOptions): Observable<IBackoffEvent<T>>;
