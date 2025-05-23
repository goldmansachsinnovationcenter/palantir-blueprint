/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
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

import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import * as ReactDOM from "react-dom";
import sinon, { spy } from "sinon";

import { expectPropValidationError } from "@blueprintjs/test-commons";

import { Classes, OverlayToaster, type OverlayToasterProps, type Toaster } from "../../src";
import { TOASTER_CREATE_NULL, TOASTER_MAX_TOASTS_INVALID } from "../../src/common/errors";

const SPECS = [
    {
        cleanup: unmountReact16Toaster,
        create: (props: OverlayToasterProps | undefined, containerElement: HTMLElement) =>
            OverlayToaster.create(props, containerElement),
        name: "create",
    },
    {
        cleanup: unmountReact16Toaster,
        create: (props: OverlayToasterProps | undefined, containerElement: HTMLElement) =>
            OverlayToaster.createAsync(props, { container: containerElement }),
        name: "createAsync",
    },
];

/**
 * Dynamically run describe blocks. The helper function here reduces indentation
 * width compared to inlining a for loop.
 *
 * https://mochajs.org/#dynamically-generating-tests
 */
function describeEach<T extends { name: string }>(specs: readonly T[], runner: (spec: T) => void) {
    for (const spec of specs) {
        describe(spec.name, () => runner(spec));
    }
}

/**
 * @param containerElement The container argument passed to OverlayToaster.create/OverlayToaster.createAsync
 */
function unmountReact16Toaster(containerElement: HTMLElement) {
    const toasterRenderRoot = containerElement.firstElementChild;
    if (toasterRenderRoot == null) {
        throw new Error("No elements were found under Toaster container.");
    }
    ReactDOM.unmountComponentAtNode(toasterRenderRoot);
}

describe("OverlayToaster", () => {
    let testsContainerElement: HTMLElement;
    let toaster: Toaster;

    describeEach(SPECS, spec => {
        describe("with default props", () => {
            before(async () => {
                testsContainerElement = document.createElement("div");
                document.documentElement.appendChild(testsContainerElement);
                toaster = await spec.create({}, testsContainerElement);
            });

            afterEach(() => {
                toaster.clear();
            });

            after(() => {
                spec.cleanup(testsContainerElement);
                document.documentElement.removeChild(testsContainerElement);
            });

            it("does not attach toast container to body on script load", () => {
                expect(document.getElementsByClassName(Classes.TOAST_CONTAINER).length).toBe(0);
            });

            it("show() renders toast on next tick", async () => {
                toaster.show({
                    message: "Hello world",
                });
                expect(toaster.getToasts().length).toBe(1);

                // setState needs a tick to flush DOM updates
                await waitFor(() => {
                    const toastContainer = document.querySelector(`.${Classes.TOAST_CONTAINER}.${Classes.OVERLAY_OPEN}`);
                    expect(toastContainer).toBeInTheDocument();
                });
            });

            it("multiple show()s renders them all", () => {
                toaster.show({ message: "one" });
                toaster.show({ message: "two" });
                toaster.show({ message: "six" });
                expect(toaster.getToasts().length).toBe(3);
            });

            it("show() updates existing toast", () => {
                const key = toaster.show({ message: "one" });
                expect(toaster.getToasts()[0].message).toBe("one");
                toaster.show({ message: "two" }, key);
                expect(toaster.getToasts().length).toBe(1);
                expect(toaster.getToasts()[0].message).toBe("two");
            });

            it("dismiss() removes just the toast in question", () => {
                toaster.show({ message: "one" });
                const key = toaster.show({ message: "two" });
                toaster.show({ message: "six" });
                toaster.dismiss(key);
                expect(toaster.getToasts().map(t => t.message)).toEqual(["six", "one"]);
            });

            it("clear() removes all toasts", () => {
                toaster.show({ message: "one" });
                toaster.show({ message: "two" });
                toaster.show({ message: "six" });
                expect(toaster.getToasts().length).toBe(3);
                toaster.clear();
                expect(toaster.getToasts().length).toBe(0);
            });

            it("action onClick callback invoked when action clicked", async () => {
                const onClick = spy();
                toaster.show({
                    action: { onClick, text: "action" },
                    message: "message",
                    timeout: 0,
                });
                
                // action is first descendant button
                const action = document.querySelector<HTMLElement>(`.${Classes.TOAST} .${Classes.BUTTON}`);
                expect(action).toBeInTheDocument();
                
                const user = userEvent.setup();
                await user.click(action!);
                
                expect(onClick.calledOnce).toBe(true);
            });

            it("onDismiss callback invoked when close button clicked", async () => {
                const handleDismiss = spy();
                toaster.show({
                    message: "dismiss",
                    onDismiss: handleDismiss,
                    timeout: 0,
                });
                
                // without action, dismiss is first descendant button
                const dismiss = document.querySelector<HTMLElement>(`.${Classes.TOAST} .${Classes.BUTTON}`);
                expect(dismiss).toBeInTheDocument();
                
                const user = userEvent.setup();
                await user.click(dismiss!);
                
                expect(handleDismiss.calledOnce).toBe(true);
            });

            it("onDismiss callback invoked on toaster.dismiss()", () => {
                const onDismiss = spy();
                const key = toaster.show({ message: "dismiss me", onDismiss });
                toaster.dismiss(key);
                expect(onDismiss.calledOnce).toBe(true);
            });

            it("onDismiss callback invoked on toaster.clear()", () => {
                const onDismiss = spy();
                toaster.show({ message: "dismiss me", onDismiss });
                toaster.clear();
                expect(onDismiss.calledOnce).toBe(true);
            });

            it("reusing props object does not produce React errors", () => {
                const errorSpy = spy(console, "error");
                try {
                    // if Toaster doesn't clone the props object before injecting key then there will be a
                    // React error that both toasts have the same key, because both instances refer to the
                    // same object.
                    const toast = { message: "repeat" };
                    toaster.show(toast);
                    toaster.show(toast);
                    expect(errorSpy.calledWithMatch("two children with the same key")).toBe(false);
                } finally {
                    // Restore console.error. Otherwise other tests will fail
                    // with "TypeError: Attempted to wrap error which is already
                    // wrapped" when attempting to spy on console.error again.
                    sinon.restore();
                }
            });
        });

        describe("with maxToasts set to finite value", () => {
            before(async () => {
                testsContainerElement = document.createElement("div");
                document.documentElement.appendChild(testsContainerElement);
                toaster = await spec.create({ maxToasts: 3 }, testsContainerElement);
            });

            after(() => {
                unmountReact16Toaster(testsContainerElement);
                document.documentElement.removeChild(testsContainerElement);
            });

            it("does not exceed the maximum toast limit set", () => {
                toaster.show({ message: "one" });
                toaster.show({ message: "two" });
                toaster.show({ message: "three" });
                toaster.show({ message: "oh no" });
                expect(toaster.getToasts().length).toBe(3);
            });
        });

        describe("with autoFocus set to true", () => {
            before(async () => {
                testsContainerElement = document.createElement("div");
                document.documentElement.appendChild(testsContainerElement);
                toaster = await spec.create({ autoFocus: true }, testsContainerElement);
            });

            after(() => {
                spec.cleanup(testsContainerElement);
                document.documentElement.removeChild(testsContainerElement);
            });

            it("focuses inside toast container", async () => {
                toaster.show({ message: "focus near me" });
                
                // small explicit timeout reduces flakiness of these tests
                await waitFor(() => {
                    const toastElement = testsContainerElement.querySelector(`.${Classes.TOAST_CONTAINER}`);
                    expect(toastElement?.contains(document.activeElement)).toBe(true);
                }, { timeout: 200 });
            });
        });

        it("throws an error if used within a React lifecycle method", () => {
            testsContainerElement = document.createElement("div");

            class LifecycleToaster extends React.Component {
                public render() {
                    return React.createElement("div");
                }

                public componentDidMount() {
                    try {
                        spec.create({}, testsContainerElement);
                    } catch (err: any) {
                        expect(err.message).toBe(TOASTER_CREATE_NULL);
                    } finally {
                        spec.cleanup(testsContainerElement);
                    }
                }
            }
            
            render(<LifecycleToaster />);
        });
    });

    describe("validation", () => {
        it("throws an error when max toast is set to a number less than 1", () => {
            expectPropValidationError(OverlayToaster, { maxToasts: 0 }, TOASTER_MAX_TOASTS_INVALID);
        });
    });
});
