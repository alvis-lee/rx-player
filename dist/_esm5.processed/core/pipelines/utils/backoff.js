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
import { timer as observableTimer, } from "rxjs";
import { catchError, map, mergeMap, startWith, } from "rxjs/operators";
import { isOffline } from "../../../compat";
import { isKnownError, NetworkErrorTypes, RequestError, } from "../../../errors";
import getFuzzedDelay from "../../../utils/get_fuzzed_delay";
/**
 * Called on a pipeline's loader error.
 * Returns whether the loader request should be retried.
 * @param {Error} error
 * @returns {Boolean} - If true, the request can be retried.
 */
function shouldRetry(error) {
    if (error instanceof RequestError) {
        if (error.type === NetworkErrorTypes.ERROR_HTTP_CODE) {
            return error.status >= 500 ||
                error.status === 404 ||
                error.status === 415 || // some CDN seems to use that code when
                // requesting low-latency segments too much
                // in advance
                error.status === 412;
        }
        return error.type === NetworkErrorTypes.TIMEOUT ||
            error.type === NetworkErrorTypes.ERROR_EVENT;
    }
    return isKnownError(error) && error.code === "INTEGRITY_ERROR";
}
/**
 * Returns true if we're pretty sure that the current error is due to the
 * user being offline.
 * @param {Error} error
 * @returns {Boolean}
 */
function isOfflineRequestError(error) {
    return error.type === NetworkErrorTypes.ERROR_EVENT &&
        isOffline();
}
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
export default function backoff(obs$, options) {
    var baseDelay = options.baseDelay, maxDelay = options.maxDelay, maxRetryRegular = options.maxRetryRegular, maxRetryOffline = options.maxRetryOffline;
    var retryCount = 0;
    var ERROR_TYPES = { NONE: 0,
        REGULAR: 1,
        OFFLINE: 2 };
    var lastError = ERROR_TYPES.NONE;
    return obs$.pipe(map(function (res) { return ({ type: "response", value: res }); }), catchError(function (error, source) {
        if (!shouldRetry(error)) {
            throw error;
        }
        var currentError = error instanceof RequestError &&
            isOfflineRequestError(error) ? ERROR_TYPES.OFFLINE :
            ERROR_TYPES.REGULAR;
        var maxRetry = currentError === ERROR_TYPES.OFFLINE ? maxRetryOffline :
            maxRetryRegular;
        if (currentError !== lastError) {
            retryCount = 0;
            lastError = currentError;
        }
        if (++retryCount > maxRetry) {
            throw error;
        }
        var delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
        var fuzzedDelay = getFuzzedDelay(delay);
        return observableTimer(fuzzedDelay).pipe(mergeMap(function () { return source; }), startWith({ type: "retry", value: error }));
    }));
}
