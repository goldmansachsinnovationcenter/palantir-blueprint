/*
 * Copyright 2023 Palantir Technologies, Inc. All rights reserved.
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
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { spy } from "sinon";

import { CheckboxCard, Classes, RadioCard, RadioGroup, SwitchCard } from "../../src";

describe("ControlCard", () => {
    let testsContainerElement: HTMLElement;

    beforeEach(() => {
        testsContainerElement = document.createElement("div");
        document.body.appendChild(testsContainerElement);
    });

    afterEach(() => {
        testsContainerElement?.remove();
    });

    describe("SwitchCard", () => {
        const handleControlChangeSpy = spy();

        beforeEach(() => {
            handleControlChangeSpy.resetHistory();
        });

        it("clicking on label element toggles switch state", async () => {
            render(<SwitchCard defaultChecked={false} onChange={handleControlChangeSpy} />, {
                container: testsContainerElement,
            });
            
            const switchInput = testsContainerElement.querySelector("input");
            expect(switchInput).toBeInTheDocument();
            
            const user = userEvent.setup();
            await user.click(switchInput!);
            
            expect(handleControlChangeSpy.calledOnce).toBe(true);
        });
    });

    describe("CheckboxCard", () => {
        it("is left-aligned by default", () => {
            render(<CheckboxCard />, { container: testsContainerElement });
            
            const controlElement = testsContainerElement.querySelector(`.${Classes.CONTROL}.${Classes.ALIGN_LEFT}`);
            expect(controlElement).toBeInTheDocument();
        });
    });

    describe("RadioCard", () => {
        it("works like a Radio component inside a RadioGroup", async () => {
            const changeSpy = spy();
            render(
                <RadioGroup onChange={changeSpy}>
                    <RadioCard value="one" label="One" />
                    <RadioCard value="two" label="Two" />
                </RadioGroup>,
                { container: testsContainerElement }
            );
            
            const inputOne = testsContainerElement.querySelector('input[value="one"]');
            const inputTwo = testsContainerElement.querySelector('input[value="two"]');
            
            expect(inputOne).toBeInTheDocument();
            expect(inputTwo).toBeInTheDocument();
            
            const user = userEvent.setup();
            await user.click(inputOne!);
            await user.click(inputTwo!);
            
            expect(changeSpy.callCount).toBe(2);
        });
    });
});
