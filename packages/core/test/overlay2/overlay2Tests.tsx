/*
 * Copyright 2024 Palantir Technologies, Inc. All rights reserved.
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
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { spy } from "sinon";

import { dispatchMouseEvent } from "@blueprintjs/test-commons";

import {
    Classes,
    Overlay2,
    type Overlay2Props,
    type OverlayInstance,
    OverlaysProvider,
    Portal,
    Utils,
} from "../../src";
import { findInPortal } from "../utils";

import "./overlay2-test-debugging.scss";

const BACKDROP_SELECTOR = `.${Classes.OVERLAY_BACKDROP}`;

/**
 * Testable `<Overlay2>` wrapper harness which includes the necessary context providers.
 */
function OverlayWrapper(props: Overlay2Props) {
    return (
        <OverlaysProvider>
            <Overlay2 transitionDuration={0} {...props} />
        </OverlaysProvider>
    );
}

interface MultipleOverlaysWrapperProps {
    first: Overlay2Props;
    second: Overlay2Props;
}

function MultipleOverlaysWrapper(props: MultipleOverlaysWrapperProps) {
    return (
        <OverlaysProvider>
            <Overlay2 transitionDuration={0} {...props.first} />
            <Overlay2 transitionDuration={0} {...props.second} />
        </OverlaysProvider>
    );
}

/*
 * IMPORTANT NOTE: It is critical that every <Overlay2> wrapper be unmounted after the test, to avoid
 * polluting the DOM with leftover overlay elements. This was the cause of the Overlay test flakes of
 * late 2017/early 2018 and was resolved by ensuring that every wrapper is unmounted.
 *
 * React Testing Library automatically cleans up after each test, but we still need to be careful
 * with any manual DOM manipulations.
 */
describe("<Overlay2>", () => {
    const testsContainerElement = document.createElement("div");
    document.documentElement.appendChild(testsContainerElement);

    afterAll(() => {
        document.documentElement.removeChild(testsContainerElement);
    });

    /**
     * Render the component into the test container
     */
    function renderIntoContainer(content: React.ReactElement) {
        return render(content, { container: testsContainerElement });
    }

    it("renders its content correctly", () => {
        renderIntoContainer(
            <OverlayWrapper isOpen={true} usePortal={false}>
                {createOverlayContents()}
            </OverlayWrapper>,
        );
        
        expect(screen.getByText("Overlay2 content!")).toBeInTheDocument();
        expect(document.querySelector(BACKDROP_SELECTOR)).toBeInTheDocument();
    });

    it("renders contents to specified container correctly", () => {
        const CLASS_TO_TEST = "bp-test-content";
        const container = document.createElement("div");
        document.body.appendChild(container);
        
        render(
            <OverlayWrapper isOpen={true} portalContainer={container}>
                <p className={CLASS_TO_TEST}>test</p>
            </OverlayWrapper>,
        );
        
        expect(container.getElementsByClassName(CLASS_TO_TEST).length).toBe(1);
        document.body.removeChild(container);
    });

    it("sets aria-live", () => {
        // Using an open Overlay2 because an initially closed Overlay2 will not render anything to the
        // DOM
        renderIntoContainer(<OverlayWrapper className="aria-test" isOpen={true} usePortal={false} />);
        const overlayElement = document.querySelector(".aria-test");
        expect(overlayElement).toBeInTheDocument();
        // Element#ariaLive not supported in Firefox or IE
        expect(overlayElement?.getAttribute("aria-live")).toBe("polite");
    });

    it("portalClassName appears on Portal", () => {
        const CLASS_TO_TEST = "bp-test-content";
        render(
            <OverlayWrapper isOpen={true} portalClassName={CLASS_TO_TEST}>
                <p>test</p>
            </OverlayWrapper>,
        );
        // search document for portal container element.
        expect(document.querySelector(`.${Classes.PORTAL}.${CLASS_TO_TEST}`)).toBeInTheDocument();
    });

    it("renders Portal after first opened", async () => {
        const { rerender } = render(<OverlayWrapper isOpen={false}>{createOverlayContents()}</OverlayWrapper>);
        
        expect(document.querySelectorAll(`.${Classes.PORTAL}`).length).toBe(0);
        
        rerender(<OverlayWrapper isOpen={true}>{createOverlayContents()}</OverlayWrapper>);
        
        expect(document.querySelectorAll(`.${Classes.PORTAL}`).length).toBe(1);
    });

    it("supports non-element children", () => {
        expect(() => {
            render(
                <OverlayWrapper isOpen={true} usePortal={false}>
                    {null} {undefined}
                </OverlayWrapper>,
            );
        }).not.toThrow();
    });

    it("hasBackdrop=false does not render backdrop", () => {
        renderIntoContainer(
            <OverlayWrapper hasBackdrop={false} isOpen={true} usePortal={false}>
                {createOverlayContents()}
            </OverlayWrapper>,
        );
        
        expect(screen.getByText("Overlay2 content!")).toBeInTheDocument();
        expect(document.querySelector(BACKDROP_SELECTOR)).not.toBeInTheDocument();
    });

    it("renders portal attached to body when not inline after first opened", async () => {
        const { rerender } = render(<OverlayWrapper isOpen={false}>{createOverlayContents()}</OverlayWrapper>);
        
        expect(document.querySelectorAll(`.${Classes.PORTAL}`).length).toBe(0);
        
        rerender(<OverlayWrapper isOpen={true}>{createOverlayContents()}</OverlayWrapper>);
        
        expect(document.querySelectorAll(`.${Classes.PORTAL}`).length).toBe(1);
    });

    describe("onClose", () => {
        it("invoked on backdrop mousedown when canOutsideClickClose=true", async () => {
            const onClose = spy();
            renderIntoContainer(
                <OverlayWrapper canOutsideClickClose={true} isOpen={true} onClose={onClose} usePortal={false}>
                    {createOverlayContents()}
                </OverlayWrapper>,
            );
            
            const backdrop = document.querySelector(BACKDROP_SELECTOR);
            expect(backdrop).toBeInTheDocument();
            
            const user = userEvent.setup();
            await user.click(backdrop!);
            
            expect(onClose.calledOnce).toBe(true);
        });

        it("not invoked on backdrop mousedown when canOutsideClickClose=false", async () => {
            const onClose = spy();
            renderIntoContainer(
                <OverlayWrapper canOutsideClickClose={false} isOpen={true} onClose={onClose} usePortal={false}>
                    {createOverlayContents()}
                </OverlayWrapper>,
            );
            
            const backdrop = document.querySelector(BACKDROP_SELECTOR);
            expect(backdrop).toBeInTheDocument();
            
            const user = userEvent.setup();
            await user.click(backdrop!);
            
            expect(onClose.notCalled).toBe(true);
        });

        it("invoked on document mousedown when hasBackdrop=false", () => {
            const onClose = spy();
            // mounting cuz we need document events + lifecycle
            renderIntoContainer(
                <OverlayWrapper hasBackdrop={false} isOpen={true} onClose={onClose} usePortal={false}>
                    {createOverlayContents()}
                </OverlayWrapper>,
            );

            dispatchMouseEvent(document.documentElement, "mousedown");
            expect(onClose.calledOnce).toBe(true);
        });

        it("not invoked on document mousedown when hasBackdrop=false and canOutsideClickClose=false", () => {
            const onClose = spy();
            renderIntoContainer(
                <OverlayWrapper
                    canOutsideClickClose={false}
                    hasBackdrop={false}
                    isOpen={true}
                    onClose={onClose}
                    usePortal={false}
                >
                    {createOverlayContents()}
                </OverlayWrapper>,
            );

            dispatchMouseEvent(document.documentElement, "mousedown");
            expect(onClose.notCalled).toBe(true);
        });

        it("not invoked on click of a nested overlay", async () => {
            const onClose = spy();
            render(
                <OverlayWrapper isOpen={true} onClose={onClose}>
                    <div id="outer-element">
                        {createOverlayContents()}
                        <OverlayWrapper isOpen={true}>
                            <div id="inner-element">{createOverlayContents()}</div>
                        </OverlayWrapper>
                    </div>
                </OverlayWrapper>,
            );
            
            await waitFor(() => {
                const innerElement = document.querySelector("#inner-element");
                expect(innerElement).toBeInTheDocument();
            });
            
            const innerElement = document.querySelector("#inner-element");
            const user = userEvent.setup();
            await user.click(innerElement!);
            
            expect(onClose.notCalled).toBe(true);
        });

        it("invoked on escape key", () => {
            const onClose = spy();
            renderIntoContainer(
                <OverlayWrapper isOpen={true} onClose={onClose} usePortal={false}>
                    {createOverlayContents()}
                </OverlayWrapper>,
            );
            
            fireEvent.keyDown(document.body, { key: "Escape" });
            expect(onClose.calledOnce).toBe(true);
        });

        it("not invoked on escape key when canEscapeKeyClose=false", () => {
            const onClose = spy();
            renderIntoContainer(
                <OverlayWrapper canEscapeKeyClose={false} isOpen={true} onClose={onClose} usePortal={false}>
                    {createOverlayContents()}
                </OverlayWrapper>,
            );
            
            fireEvent.keyDown(document.body, { key: "Escape" });
            expect(onClose.notCalled).toBe(true);
        });

        it("renders portal attached to body when not inline", () => {
            render(
                <OverlayWrapper isOpen={true} usePortal={true}>
                    {createOverlayContents()}
                </OverlayWrapper>,
            );
            
            const portal = document.querySelector(`.${Classes.PORTAL}`);
            expect(portal).toBeInTheDocument();
            
            const strongElement = portal?.querySelector("strong");
            expect(strongElement).toBeInTheDocument();
        });
    });

    describe("Focus management", () => {
        const overlayClassName = "test-overlay";

        it("brings focus to overlay if autoFocus=true", done => {
            render(
                <OverlayWrapper className={overlayClassName} autoFocus={true} isOpen={true} usePortal={true}>
                    <input type="text" />
                </OverlayWrapper>,
            );
            assertFocusIsInOverlayWithTimeout(done);
        });

        it("does not bring focus to overlay if autoFocus=false and enforceFocus=false", done => {
            render(
                <div>
                    <button>something outside overlay for browser to focus on</button>
                    <OverlayWrapper
                        className={overlayClassName}
                        autoFocus={false}
                        enforceFocus={false}
                        isOpen={true}
                        usePortal={true}
                    >
                        <input type="text" />
                    </OverlayWrapper>
                </div>,
            );
            assertFocusWithTimeout("body", done);
        });

        // React implements autoFocus itself so our `[autofocus]` logic never fires.
        // Still, worth testing we can control where the focus goes.
        it("autoFocus element inside overlay gets the focus", done => {
            render(
                <OverlayWrapper className={overlayClassName} isOpen={true} usePortal={true}>
                    <input autoFocus={true} type="text" />
                </OverlayWrapper>,
            );
            assertFocusWithTimeout("input", done);
        });

        it("returns focus to overlay if enforceFocus=true", done => {
            const buttonRef = React.createRef<HTMLButtonElement>();
            const inputRef = React.createRef<HTMLInputElement>();
            render(
                <div>
                    <button ref={buttonRef} />
                    <OverlayWrapper className={overlayClassName} enforceFocus={true} isOpen={true} usePortal={true}>
                        <div>
                            <input autoFocus={true} ref={inputRef} />
                        </div>
                    </OverlayWrapper>
                </div>,
            );
            expect(document.activeElement).toBe(inputRef.current);
            buttonRef.current?.focus();
            assertFocusIsInOverlayWithTimeout(done);
        });

        it("returns focus to overlay after clicking the backdrop if enforceFocus=true", done => {
            renderIntoContainer(
                <OverlayWrapper
                    className={overlayClassName}
                    enforceFocus={true}
                    canOutsideClickClose={false}
                    isOpen={true}
                    usePortal={false}
                >
                    {createOverlayContents()}
                </OverlayWrapper>,
            );
            
            const backdrop = document.querySelector(BACKDROP_SELECTOR);
            expect(backdrop).toBeInTheDocument();
            fireEvent.mouseDown(backdrop!);
            
            assertFocusIsInOverlayWithTimeout(done);
        });

        it("returns focus to overlay after clicking an outside element if enforceFocus=true", done => {
            renderIntoContainer(
                <div>
                    <OverlayWrapper
                        enforceFocus={true}
                        canOutsideClickClose={false}
                        className={overlayClassName}
                        isOpen={true}
                        usePortal={false}
                        hasBackdrop={false}
                    >
                        {createOverlayContents()}
                    </OverlayWrapper>
                    <button id="buttonId" />
                </div>,
            );
            
            const button = document.querySelector("#buttonId");
            expect(button).toBeInTheDocument();
            fireEvent.click(button!);
            
            assertFocusIsInOverlayWithTimeout(done);
        });

        it("does not result in maximum call stack if two overlays open with enforceFocus=true", () => {
            const firstOverlayInstance = React.createRef<OverlayInstance>();
            const secondOverlayInputID = "inputId";

            const firstOverlay = {
                children: <input type="text" />,
                className: overlayClassName,
                isOpen: true,
                ref: firstOverlayInstance,
                usePortal: false,
            };
            const secondOverlay = {
                children: <input id={secondOverlayInputID} type="text" />,
                className: overlayClassName,
                isOpen: false,
                usePortal: false,
            };
            
            const { rerender } = render(
                <MultipleOverlaysWrapper first={firstOverlay} second={secondOverlay} />,
                { container: testsContainerElement }
            );

            expect(firstOverlayInstance.current).not.toBeNull();

            // open the second overlay
            rerender(<MultipleOverlaysWrapper first={firstOverlay} second={{ ...secondOverlay, isOpen: true }} />);

            const secondOverlayInputElement = document.querySelector(`#${secondOverlayInputID}`);
            expect(secondOverlayInputElement).not.toBeNull();
            expect(secondOverlayInputElement).toBeInTheDocument();

            // this click potentially triggers infinite recursion if both overlays try to bring focus back to themselves
            fireEvent.click(secondOverlayInputElement!);
            // previous test suites for Overlay spied on bringFocusInsideOverlay and asserted it was called once here,
            // but that is more difficult to test with function components and breaches the abstraction of Overlay2.
        });

        it("does not return focus to overlay if enforceFocus=false", done => {
            let buttonRef: HTMLElement | null;
            const focusBtnAndAssert = () => {
                buttonRef?.focus();
                expect(document.activeElement).toBe(buttonRef);
                done();
            };

            render(
                <div>
                    <button ref={ref => (buttonRef = ref)} />
                    <OverlayWrapper className={overlayClassName} enforceFocus={false} isOpen={true} usePortal={true}>
                        <div>
                            <input ref={ref => ref && setTimeout(focusBtnAndAssert)} />
                        </div>
                    </OverlayWrapper>
                </div>,
            );
        });

        it("doesn't focus overlay if focus is already inside overlay", done => {
            let textarea: HTMLTextAreaElement | null;
            render(
                <OverlayWrapper className={overlayClassName} isOpen={true} usePortal={true}>
                    <div>
                        <textarea ref={ref => (textarea = ref)} />
                    </div>
                </OverlayWrapper>,
            );
            textarea!.focus();
            assertFocusWithTimeout("textarea", done);
        });

        it("does not focus overlay when closed", done => {
            render(
                <div>
                    <button ref={ref => ref && ref.focus()} />
                    <OverlayWrapper className={overlayClassName} isOpen={false} usePortal={true} />
                </div>,
            );
            assertFocusWithTimeout("button", done);
        });

        it("does not crash while trying to return focus to overlay if user clicks outside the document", () => {
            renderIntoContainer(
                <OverlayWrapper
                    className={overlayClassName}
                    enforceFocus={true}
                    canOutsideClickClose={false}
                    isOpen={true}
                    usePortal={false}
                >
                    {createOverlayContents()}
                </OverlayWrapper>,
            );

            // this is a fairly custom / nonstandard event dispatch, trying to simulate what happens in some browsers when a user clicks
            // on the browser toolbar (outside the document), but a focus event is still dispatched to document
            // see https://github.com/palantir/blueprint/issues/3928
            const event = new FocusEvent("focus");
            Object.defineProperty(event, "target", { value: window });

            expect(() => {
                document.dispatchEvent(event);
            }).not.toThrow();
        });

        function assertFocusWithTimeout(selector: string | (() => void), done: Mocha.Done) {
            // the behavior being tested relies on requestAnimationFrame.
            // setTimeout for a few frames later to let things settle (to reduce flakes).
            setTimeout(() => {
                if (Utils.isFunction(selector)) {
                    selector();
                } else {
                    expect(document.querySelector(selector)).toBe(document.activeElement);
                }
                done();
            }, 40);
        }

        function assertFocusIsInOverlayWithTimeout(done: Mocha.Done) {
            assertFocusWithTimeout(() => {
                const overlayElement = document.querySelector(`.${overlayClassName}`);
                expect(overlayElement?.contains(document.activeElement)).toBe(true);
            }, done);
        }
    });

    describe("Background scrolling", () => {
        // force-reset Overlay2 stack state between tests
        afterEach(() => {
            document.body.classList.remove(Classes.OVERLAY_OPEN);
        });

        describe("upon mount", () => {
            it("disables document scrolling by default", () => {
                render(renderBackdropOverlay());
                assertBodyScrollingDisabled(true);
            });

            it("disables document scrolling if hasBackdrop=true and usePortal=true", () => {
                render(renderBackdropOverlay(true, true));
                assertBodyScrollingDisabled(true);
            });

            it("does not disable document scrolling if hasBackdrop=true and usePortal=false", () => {
                render(renderBackdropOverlay(true, false));
                assertBodyScrollingDisabled(false);
            });

            it("does not disable document scrolling if hasBackdrop=false and usePortal=true", () => {
                render(renderBackdropOverlay(false, true));
                assertBodyScrollingDisabled(false);
            });

            it("does not disable document scrolling if hasBackdrop=false and usePortal=false", () => {
                render(renderBackdropOverlay(false, false));
                assertBodyScrollingDisabled(false);
            });
        });

        describe("after closing (no overlays remaining)", () => {
            // N.B. this tests some of the behavior of useOverlaysProvider(), which we might want to extract
            // to a separate test suite
            it("restores body scrolling", () => {
                const { rerender } = render(
                    <OverlayWrapper isOpen={true} usePortal={true}>
                        {createOverlayContents()}
                    </OverlayWrapper>,
                );
                
                rerender(
                    <OverlayWrapper isOpen={false} usePortal={true}>
                        {createOverlayContents()}
                    </OverlayWrapper>,
                );
                
                const overlayElement = document.querySelector(`.${Classes.OVERLAY}`);
                expect(overlayElement?.classList.contains(Classes.OVERLAY_OPEN)).toBe(false);
                assertBodyScrollingDisabled(false);
            });
        });

        describe("after closing (but some overlays remain open)", () => {
            it("keeps scrolling disabled if some overlay with hasBackdrop=true exists", () => {
                const firstOverlay = {
                    children: createOverlayContents(),
                    hasBackdrop: true,
                    isOpen: true,
                    usePortal: true,
                };
                const secondOverlay = {
                    children: createOverlayContents(),
                    hasBackdrop: true,
                    isOpen: true,
                    usePortal: true,
                };
                
                const { rerender } = render(
                    <MultipleOverlaysWrapper first={firstOverlay} second={secondOverlay} />,
                    { container: testsContainerElement }
                );

                // close the first overlay which has a backdrop
                rerender(
                    <MultipleOverlaysWrapper first={{ ...firstOverlay, isOpen: false }} second={secondOverlay} />
                );

                // the second overlay with a backdrop should still be open
                assertBodyScrollingDisabled(true);
            });

            it("doesn't keep scrolling disabled if no overlay exists with hasBackdrop=true", () => {
                const firstOverlay = {
                    children: createOverlayContents(),
                    hasBackdrop: true,
                    isOpen: true,
                    usePortal: true,
                };
                const secondOverlay = {
                    children: createOverlayContents(),
                    hasBackdrop: false,
                    isOpen: true,
                    usePortal: true,
                };
                
                const { rerender } = render(
                    <MultipleOverlaysWrapper first={firstOverlay} second={secondOverlay} />,
                    { container: testsContainerElement }
                );

                // close the first overlay which has a backdrop
                rerender(
                    <MultipleOverlaysWrapper first={{ ...firstOverlay, isOpen: false }} second={secondOverlay} />
                );

                // the second overlay should still be open, but it has no backdrop
                assertBodyScrollingDisabled(false);
            });
        });

        function renderBackdropOverlay(hasBackdrop?: boolean, usePortal?: boolean) {
            return (
                <OverlayWrapper hasBackdrop={hasBackdrop} isOpen={true} usePortal={usePortal}>
                    {createOverlayContents()}
                </OverlayWrapper>
            );
        }

        // N.B. previous iterations of this test used a `setTimeout()` to wait for DOM updates to be
        // flushed before checking the body classes. This is no longer necessary with Overlay2 and
        // the `useOverlayStack()` hook.
        function assertBodyScrollingDisabled(disabled: boolean) {
            const hasClass = document.body.classList.contains(Classes.OVERLAY_OPEN);
            expect(hasClass).toBe(
                disabled,
                `expected <body> element to ${disabled ? "have" : "not have"} ${Classes.OVERLAY_OPEN} class`,
            );
        }
    });

    it("lifecycle methods called as expected", done => {
        // these lifecycles are passed directly to CSSTransition from react-transition-group
        // so we do not need to test these extensively. one integration test should do.
        const onClosed = spy();
        const onClosing = spy();
        const onOpened = spy();
        const onOpening = spy();
        
        render(
            <OverlayWrapper
                {...{ onClosed, onClosing, onOpened, onOpening }}
                isOpen={true}
                usePortal={false}
                // transition duration shorter than timeout below to ensure it's done
                transitionDuration={8}
            >
                {createOverlayContents()}
            </OverlayWrapper>,
        );
        
        expect(onOpening.calledOnce).toBe(true);
        expect(onOpened.calledOnce).toBe(false);

        setTimeout(() => {
            // on*ed called after transition completes
            expect(onOpened.calledOnce).toBe(true);

            render(
                <OverlayWrapper
                    {...{ onClosed, onClosing, onOpened, onOpening }}
                    isOpen={false}
                    usePortal={false}
                    transitionDuration={8}
                >
                    {createOverlayContents()}
                </OverlayWrapper>,
            );
            
            // on*ing called immediately when prop changes
            expect(onClosing.calledOnce).toBe(true);
            expect(onClosed.calledOnce).toBe(false);

            setTimeout(() => {
                expect(onClosed.calledOnce).toBe(true);
                done();
            }, 10);
        }, 10);
    });

    let index = 0;
    function createOverlayContents() {
        return (
            <strong id={`overlay-${index++}`} tabIndex={0}>
                Overlay2 content!
            </strong>
        );
    }
});
