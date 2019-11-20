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
import PPromise from "../../utils/promise";
/**
 * Simple implementation of the MediaKeySystemAccess EME API.
 *
 * All needed arguments are given to the constructor
 * @class CustomMediaKeySystemAccess
 */
var CustomMediaKeySystemAccess = /** @class */ (function () {
    /**
     * @param {string} _keyType - type of key system (e.g. "widevine" or
     * "com.widevine.alpha").
     * @param {Object} _mediaKeys - MediaKeys implementation
     * @param {Object} _configuration - Configuration accepted for this
     * MediaKeySystemAccess.
     */
    function CustomMediaKeySystemAccess(_keyType, _mediaKeys, _configuration) {
        this._keyType = _keyType;
        this._mediaKeys = _mediaKeys;
        this._configuration = _configuration;
    }
    Object.defineProperty(CustomMediaKeySystemAccess.prototype, "keySystem", {
        /**
         * @returns {string} - current key system type (e.g. "widevine" or
         * "com.widevine.alpha").
         */
        get: function () {
            return this._keyType;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @returns {Promise.<Object>} - Promise wrapping the MediaKeys for this
     * MediaKeySystemAccess. Never rejects.
     */
    CustomMediaKeySystemAccess.prototype.createMediaKeys = function () {
        var _this = this;
        return new PPromise(function (res) { return res(_this._mediaKeys); });
    };
    /**
     * @returns {Object} - Configuration accepted for this MediaKeySystemAccess.
     */
    CustomMediaKeySystemAccess.prototype.getConfiguration = function () {
        return this._configuration;
    };
    return CustomMediaKeySystemAccess;
}());
export default CustomMediaKeySystemAccess;
