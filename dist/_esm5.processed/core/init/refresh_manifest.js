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
import { EMPTY, } from "rxjs";
import { tap } from "rxjs/operators";
import log from "../../log";
import isNonEmptyString from "../../utils/is_non_empty_string";
/**
 * Refresh the manifest on subscription.
 * @returns {Observable}
 */
export default function refreshManifest(manifest, fetchManifest) {
    var refreshURL = manifest.getUrl();
    if (!isNonEmptyString(refreshURL)) {
        log.warn("Init: Cannot refresh the manifest: no url");
        return EMPTY;
    }
    var externalClockOffset = manifest.getClockOffset();
    return fetchManifest(refreshURL, externalClockOffset)
        .pipe(tap(function (_a) {
        var newManifest = _a.manifest;
        manifest.update(newManifest);
    }));
}
