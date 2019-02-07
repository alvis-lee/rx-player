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

describe("Features list - DASH", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should add DASH in the current features", () => {
    const feat = {};
    jest.mock("../../../transports/dash", () => ({ default: feat }));
    const addDASHFeature = require("../dash").default;

    const featureObject : {
      transports : { [featureName : string] : unknown };
    } = { transports: {} };
    addDASHFeature(featureObject);
    expect(featureObject).toEqual({ transports: { dash: {} } });
    expect(featureObject.transports.dash).toBe(feat);
  });
});