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
export default function callCustomManifestLoader(customManifestLoader, fallbackManifestLoader) {
    return function (args) {
        return new Observable(function (obs) {
            var url = args.url;
            var timeAPIsDelta = Date.now() - performance.now();
            var hasFinished = false;
            var hasFallbacked = false;
            /**
             * Callback triggered when the custom manifest loader has a response.
             * @param {Object} args
             */
            var resolve = function (_args) {
                if (!hasFallbacked) {
                    hasFinished = true;
                    var receivedTime = _args.receivingTime != null ? _args.receivingTime - timeAPIsDelta :
                        undefined;
                    var sendingTime = _args.sendingTime != null ? _args.sendingTime - timeAPIsDelta :
                        undefined;
                    obs.next({ type: "data-loaded",
                        value: { responseData: _args.data,
                            size: _args.size,
                            duration: _args.duration,
                            url: _args.url,
                            receivedTime: receivedTime, sendingTime: sendingTime } });
                    obs.complete();
                }
            };
            /**
             * Callback triggered when the custom manifest loader fails
             * @param {*} err - The corresponding error encountered
             */
            var reject = function (err) {
                if (!hasFallbacked) {
                    hasFinished = true;
                    obs.error(err);
                }
            };
            /**
             * Callback triggered when the custom manifest loader wants to fallback to
             * the "regular" implementation
             */
            var fallback = function () {
                hasFallbacked = true;
                fallbackManifestLoader(args).subscribe(obs);
            };
            var callbacks = { reject: reject, resolve: resolve, fallback: fallback };
            var abort = customManifestLoader(url, callbacks);
            return function () {
                if (!hasFinished && !hasFallbacked && typeof abort === "function") {
                    abort();
                }
            };
        });
    };
}
