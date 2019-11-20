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
import { defer as observableDefer, Subject, } from "rxjs";
import { finalize, mergeMap, } from "rxjs/operators";
import arrayFindIndex from "../../../utils/array_find_index";
/**
 * Create Observables which can be priorized between one another.
 *
 * With this class, you can create Observables with linked priority numbers.
 * The lower this number is, the more priority the resulting Observable will
 * have.
 *
 * Such Observable will then basically wait for pending Observables with more
 * priority to finish before "starting".
 *
 * You can also update the priority of an already-created Observable.
 * This will only have an effect if the Observable is currently "waiting" for
 * its turn (started observable won't be canceled if their priority were
 * lowered).
 *
 * ```js
 * const prioritizer = new ObservablePrioritizer();
 *
 * const observable1 = Observable.of(1);
 * const observable2 = Observable.of(2);
 * const observable3 = Observable.of(3);
 * const observable4 = Observable.of(4);
 * const observable5 = Observable.of(5);
 *
 * const pObservable1 = prioritizer.create(observable1, 4);
 * const pObservable2 = prioritizer.create(observable2, 2);
 * const pObservable3 = prioritizer.create(observable3, 1);
 * const pObservable4 = prioritizer.create(observable4, 3);
 * const pObservable5 = prioritizer.create(observable5, 2);
 *
 * // start every Observables at the same time
 * observableMerge(
 *   pObservable1,
 *   pObservable2,
 *   pObservable3,
 *   pObservable4,
 *   pObservable5
 * ).subscribe((i) => {
 *   // To spice things up, update pObservable1 priority to go before
 *   // pObservable4
 *   if (i === 5) { // if pObservable5 is currently emitting
 *     prioritizer.updatePriority(pObservable1, 1);
 *   }
 *   console.log(i);
 * });
 *
 * // Result:
 * // 3
 * // 2
 * // 5
 * // 1
 * // 4
 *
 * // Note: here "1" goes before "4" only because the former's priority has been
 * // updated before the latter was started.
 * // It would be the other way around if not.
 * ```
 *
 * @class ObservablePrioritizer
 */
var ObservablePrioritizer = /** @class */ (function () {
    function ObservablePrioritizer() {
        this._pendingPriority = null;
        this._numberOfPendingObservables = 0;
        this._queue = [];
    }
    /**
     * Create a priorized Observable from a base Observable.
     *
     * When subscribed to, this Observable will have its priority compared to
     * all the already-running Observables created from this class.
     * Only if this number is inferior or equal to the priority of the
     * currently-running Observables will it be immediately started.
     * In the opposite case, we will wait for higher-priority Observables to
     * finish before starting it.
     *
     * Note that while this Observable is waiting for its turn, it is possible
     * to update its property through the updatePriority method, by providing
     * the Observable returned by this function and its new priority number.
     *
     * @param {Observable} obs
     * @param {number} priority
     * @returns {Observable}
     */
    ObservablePrioritizer.prototype.create = function (obs, priority) {
        var _this = this;
        var pObs$ = observableDefer(function () {
            if (_this._pendingPriority == null || _this._pendingPriority >= priority) {
                // Update the priority and start immediately the Observable
                _this._pendingPriority = priority;
                return _this._startObservable(obs);
            }
            else {
                var trigger = new Subject();
                _this._queue.push({ observable: pObs$, priority: priority, trigger: trigger });
                return trigger
                    .pipe(mergeMap(function () { return _this._startObservable(obs); }));
            }
        });
        return pObs$;
    };
    /**
     * Update the priority of an Observable created through the create method.
     *
     * Note that this will only have an effect on Observable which are not yet
     * started.
     * This means it will only have an effect on:
     *   - unsubscribed Observables
     *   - Observables waiting for Observables with an higher priority to
     *     finish
     *
     * @param {Observable} obs
     * @param {number} priority
     */
    ObservablePrioritizer.prototype.updatePriority = function (obs, priority) {
        var index = arrayFindIndex(this._queue, function (elt) { return elt.observable === obs; });
        if (index < 0) {
            return;
        }
        var queueElement = this._queue[index];
        queueElement.priority = priority;
        if (this._pendingPriority == null || this._pendingPriority >= priority) {
            this._queue.splice(index, 1);
            queueElement.trigger.next();
            queueElement.trigger.complete();
        }
    };
    ObservablePrioritizer.prototype._startObservable = function (obs) {
        var _this = this;
        var onObservableFinish = function () {
            _this._numberOfPendingObservables--;
            if (_this._numberOfPendingObservables > 0) {
                // still waiting for Observables to finish
                return;
            }
            _this._pendingPriority = null;
            if (_this._queue.length === 0) {
                return;
            }
            _this._pendingPriority = _this._queue
                .reduce(function (acc, elt) {
                return acc == null || acc > elt.priority ? elt.priority :
                    acc;
            }, null);
            for (var i = 0; i < _this._queue.length; i++) {
                var elt = _this._queue[i];
                if (elt.priority === _this._pendingPriority) {
                    _this._queue.splice(i, 1);
                    i--;
                    elt.trigger.next();
                    elt.trigger.complete();
                }
            }
        };
        this._numberOfPendingObservables++;
        return obs
            .pipe(finalize(onObservableFinish));
    };
    return ObservablePrioritizer;
}());
export default ObservablePrioritizer;
