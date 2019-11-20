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
import { ICustomSourceBuffer } from "../compat";
import EventEmitter from "../utils/event_emitter";
import ManualTimeRanges from "./time_ranges";
interface IAbstractSourceBufferEvent {
    updatestart: undefined;
    update: undefined;
    updateend: undefined;
    error: Event;
}
/**
 * Abstract class for a custom SourceBuffer implementation.
 * @class AbstractSourceBuffer
 * @extends EventEmitter
 */
export default abstract class AbstractSourceBuffer<T> extends EventEmitter<IAbstractSourceBufferEvent> implements ICustomSourceBuffer<T> {
    timestampOffset: number;
    updating: boolean;
    buffered: ManualTimeRanges;
    readyState: string;
    appendWindowStart: number;
    appendWindowEnd: number;
    constructor();
    /**
     * Mimic the SourceBuffer _appendBuffer_ method: Append a segment to the
     * buffer.
     * @param {*} data
     */
    appendBuffer(data: T): void;
    /**
     * Mimic the SourceBuffer _remove_ method: remove buffered segments.
     * @param {Number} from
     * @param {Number} to
     */
    remove(from: number, to: number): void;
    /**
     * Mimic the SourceBuffer _abort_ method.
     */
    abort(): void;
    protected abstract _append(_data: T): void;
    protected abstract _remove(_from: number, _to: number): void;
    protected abstract _abort(): void;
    /**
     * Active a lock, execute the given function, unlock when finished (on
     * nextTick).
     * Throws if multiple lock are active at the same time.
     * Also triggers the right events on start, error and end
     * @param {Function} func
     */
    private _lock;
}
export {};
