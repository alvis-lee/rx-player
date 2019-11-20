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
import config from "../../config";
import { RequestError } from "../../errors";
import isNonEmptyString from "../is_non_empty_string";
import isNullOrUndefined from "../is_null_or_undefined";
var DEFAULT_REQUEST_TIMEOUT = config.DEFAULT_REQUEST_TIMEOUT;
var DEFAULT_RESPONSE_TYPE = "json";
/**
 * @param {string} data
 * @returns {Object|null}
 */
function toJSONForIE(data) {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        return null;
    }
}
function request(options) {
    var requestOptions = {
        url: options.url,
        headers: options.headers,
        responseType: isNullOrUndefined(options.responseType) ? DEFAULT_RESPONSE_TYPE :
            options.responseType,
        timeout: isNullOrUndefined(options.timeout) ? DEFAULT_REQUEST_TIMEOUT :
            options.timeout,
    };
    return new Observable(function (obs) {
        var url = requestOptions.url, headers = requestOptions.headers, responseType = requestOptions.responseType, timeout = requestOptions.timeout;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        if (timeout >= 0) {
            xhr.timeout = timeout;
        }
        xhr.responseType = responseType;
        if (xhr.responseType === "document") {
            xhr.overrideMimeType("text/xml");
        }
        if (!isNullOrUndefined(headers)) {
            var _headers = headers;
            for (var key in _headers) {
                if (_headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, _headers[key]);
                }
            }
        }
        var sendingTime = performance.now();
        xhr.onerror = function onXHRError() {
            obs.error(new RequestError(url, xhr.status, "ERROR_EVENT", xhr));
        };
        xhr.ontimeout = function onXHRTimeout() {
            obs.error(new RequestError(url, xhr.status, "TIMEOUT", xhr));
        };
        if (options.sendProgressEvents === true) {
            xhr.onprogress = function onXHRProgress(event) {
                var currentTime = performance.now();
                obs.next({ type: "progress",
                    value: { url: url,
                        duration: currentTime - sendingTime,
                        sendingTime: sendingTime,
                        currentTime: currentTime,
                        size: event.loaded,
                        totalSize: event.total } });
            };
        }
        xhr.onload = function onXHRLoad(event) {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var receivedTime = performance.now();
                    var totalSize = xhr.response instanceof
                        ArrayBuffer ? xhr.response.byteLength :
                        event.total;
                    var status_1 = xhr.status;
                    var loadedResponseType = xhr.responseType;
                    var _url = isNonEmptyString(xhr.responseURL) ? xhr.responseURL :
                        url;
                    var responseData = void 0;
                    if (loadedResponseType === "json") {
                        // IE bug where response is string with responseType json
                        responseData = typeof xhr.response === "object" ?
                            /* tslint:disable no-unsafe-any */
                            xhr.response :
                            /* tslint:enable no-unsafe-any */
                            toJSONForIE(xhr.responseText);
                    }
                    else {
                        /* tslint:disable no-unsafe-any */
                        responseData = xhr.response;
                        /* tslint:enable no-unsafe-any */
                    }
                    if (isNullOrUndefined(responseData)) {
                        obs.error(new RequestError(url, xhr.status, "PARSE_ERROR", xhr));
                        return;
                    }
                    obs.next({ type: "data-loaded",
                        value: { status: status_1,
                            url: _url,
                            responseType: loadedResponseType,
                            sendingTime: sendingTime,
                            receivedTime: receivedTime,
                            duration: receivedTime - sendingTime,
                            size: totalSize,
                            responseData: responseData, }, });
                    obs.complete();
                }
                else {
                    obs.error(new RequestError(url, xhr.status, "ERROR_HTTP_CODE", xhr));
                }
            }
        };
        xhr.send();
        return function () {
            if (!isNullOrUndefined(xhr) && xhr.readyState !== 4) {
                xhr.abort();
            }
        };
    });
}
export default request;
