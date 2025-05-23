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

import { assert } from "chai";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { Classes, H4, NonIdealState } from "../../src";

describe("<NonIdealState>", () => {
    it("renders its contents", () => {
        render(
            <NonIdealState
                action={<p>More text!</p>}
                description="An error occurred."
                title="ERROR"
                icon="folder-close"
            />,
        );
        
        expect(screen.getByText("ERROR")).toBeInTheDocument();
        
        const nonIdealStateElement = screen.getByText("ERROR").closest(`.${Classes.NON_IDEAL_STATE}`);
        expect(nonIdealStateElement).toBeInTheDocument();
        
        expect(document.querySelector(`.${Classes.NON_IDEAL_STATE_VISUAL}`)).toBeInTheDocument();
        expect(document.querySelector(`.${Classes.ICON_MUTED}`)).toBeInTheDocument();
        
        expect(screen.getByText("An error occurred.")).toBeInTheDocument();
        expect(screen.getByText("More text!")).toBeInTheDocument();
    });

    it("does not apply icon muted style", () => {
        render(<NonIdealState title="ERROR" icon="folder-close" iconMuted={false} />);
        expect(document.querySelector(`.${Classes.ICON_MUTED}`)).not.toBeInTheDocument();
    });

    it("ensures description is wrapped in an element", () => {
        render(<NonIdealState action={<strong />} description="foo" />);
        const textContainer = document.querySelector(`.${Classes.NON_IDEAL_STATE_TEXT}`);
        expect(textContainer).toBeInTheDocument();
        
        const descriptionDiv = textContainer?.querySelector("div");
        expect(descriptionDiv).toBeInTheDocument();
        expect(descriptionDiv).toHaveTextContent("foo");
    });
});
