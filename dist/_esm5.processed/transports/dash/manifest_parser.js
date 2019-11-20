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
import objectAssign from "object-assign";
import { combineLatest as observableCombineLatest, of as observableOf, } from "rxjs";
import { filter, map, mergeMap, } from "rxjs/operators";
import Manifest from "../../manifest";
import dashManifestParser from "../../parsers/manifest/dash";
import request from "../../utils/request";
/**
 * Request external "xlink" ressource from a MPD.
 * @param {string} xlinkURL
 * @returns {Observable}
 */
function requestStringResource(url) {
    return request({ url: url,
        responseType: "text" })
        .pipe(filter(function (e) { return e.type === "data-loaded"; }), map(function (e) { return e.value; }));
}
export default function generateManifestParser(options) {
    var _aggressiveMode = options.aggressiveMode, lowLatencyMode = options.lowLatencyMode, referenceDateTime = options.referenceDateTime;
    var aggressiveMode = lowLatencyMode ? _aggressiveMode !== false :
        _aggressiveMode === true;
    var serverTimeOffset = options.serverSyncInfos != null ?
        options.serverSyncInfos.serverTimestamp - options.serverSyncInfos.clientTime :
        undefined;
    return function manifestParser(args) {
        var response = args.response, scheduleRequest = args.scheduleRequest;
        var argClockOffset = args.externalClockOffset;
        var loaderURL = args.url;
        var url = response.url == null ? loaderURL :
            response.url;
        var data = typeof response.responseData === "string" ?
            new DOMParser().parseFromString(response.responseData, "text/xml") :
            // TODO find a way to check if Document?
            response.responseData;
        var externalClockOffset = serverTimeOffset == null ? argClockOffset :
            serverTimeOffset;
        var parsedManifest = dashManifestParser(data, { aggressiveMode: aggressiveMode,
            url: url,
            referenceDateTime: referenceDateTime,
            externalClockOffset: externalClockOffset });
        return loadExternalResources(parsedManifest);
        function loadExternalResources(parserResponse) {
            if (parserResponse.type === "done") {
                var manifest = new Manifest(parserResponse.value, options);
                return observableOf({ manifest: manifest, url: url });
            }
            var _a = parserResponse.value, ressources = _a.ressources, continueParsing = _a.continue;
            var externalResources$ = ressources
                .map(function (resource) { return scheduleRequest(function () { return requestStringResource(resource); }); });
            return observableCombineLatest(externalResources$)
                .pipe(mergeMap(function (loadedResources) {
                var resources = [];
                for (var i = 0; i < loadedResources.length; i++) {
                    var resource = loadedResources[i];
                    if (typeof resource.responseData !== "string") {
                        throw new Error("External DASH resources should only be strings");
                    }
                    // Normally not needed but TypeScript is just dumb here
                    resources.push(objectAssign(resource, { responseData: resource.responseData }));
                }
                return loadExternalResources(continueParsing(resources));
            }));
        }
    };
}
