/*
 * Copyright 2018 Palantir Technologies, Inc. All rights reserved.
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
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import sinon from "sinon";

import { Classes } from "../../src/common";
import { Boundary } from "../../src/common/boundary";
import { Breadcrumb, type BreadcrumbProps } from "../../src/components/breadcrumbs/breadcrumb";
import { Breadcrumbs } from "../../src/components/breadcrumbs/breadcrumbs";
import { MenuItem } from "../../src/components/menu/menuItem";
import { OverflowList, type OverflowListProps } from "../../src/components/overflow-list/overflowList";

const ITEMS: BreadcrumbProps[] = [{ text: "1" }, { text: "2" }, { text: "3" }];

describe("Breadcrumbs", () => {
    let containerElement: HTMLElement;

    beforeEach(() => {
        containerElement = document.createElement("div");
        document.body.appendChild(containerElement);
    });
    
    afterEach(() => {
        containerElement?.remove();
    });

    it("passes through props to the OverflowList", () => {
        render(
            <Breadcrumbs
                className="breadcrumbs-class"
                collapseFrom={Boundary.END}
                items={[]}
                minVisibleItems={7}
                overflowListProps={{ className: "overflow-list-class", tagName: "article" }}
            />,
            { container: containerElement }
        );
        
        const overflowList = containerElement.querySelector("article");
        expect(overflowList).toBeInTheDocument();
        expect(overflowList).toHaveClass(Classes.BREADCRUMBS, "overflow-list-class", "breadcrumbs-class");
        
        expect(overflowList?.tagName.toLowerCase()).toBe("article");
    });

    it("makes the last breadcrumb current", () => {
        render(<Breadcrumbs items={ITEMS} minVisibleItems={ITEMS.length} />, {
            container: containerElement
        });
        
        const breadcrumbs = containerElement.querySelectorAll(`.${Classes.BREADCRUMB}`);
        expect(breadcrumbs.length).toBe(ITEMS.length);
        
        expect(breadcrumbs[0]).not.toHaveClass(Classes.BREADCRUMB_CURRENT);
        
        expect(breadcrumbs[ITEMS.length - 1]).toHaveClass(Classes.BREADCRUMB_CURRENT);
    });

    it("renders overflow/collapsed indicator when items don't fit", () => {
        render(
            // 70px is just enough to show one item
            <div style={{ width: 70 }}>
                <Breadcrumbs items={ITEMS} />
            </div>,
            { container: containerElement }
        );
        
        const collapsedIndicator = containerElement.querySelector(`.${Classes.BREADCRUMBS_COLLAPSED}`);
        expect(collapsedIndicator).toBeInTheDocument();
    });

    it("renders the correct overflow menu items", () => {
        render(
            // 70px is just enough to show one item
            <div style={{ width: 70 }}>
                <Breadcrumbs items={ITEMS} popoverProps={{ isOpen: true, usePortal: false }} />
            </div>,
            { container: containerElement }
        );
        
        const menuItems = containerElement.querySelectorAll(`.${Classes.MENU_ITEM}`);
        expect(menuItems.length).toBe(ITEMS.length - 1);
        
        expect(menuItems[0]).toHaveTextContent("2");
        expect(menuItems[1]).toHaveTextContent("1");
    });

    it("renders the correct overflow menu items when collapsing from END", () => {
        render(
            // 70px is just enough to show one item
            <div style={{ width: 70 }}>
                <Breadcrumbs
                    collapseFrom={Boundary.END}
                    items={ITEMS}
                    popoverProps={{ isOpen: true, usePortal: false }}
                />
            </div>,
            { container: containerElement }
        );
        
        const menuItems = containerElement.querySelectorAll(`.${Classes.MENU_ITEM}`);
        expect(menuItems.length).toBe(ITEMS.length - 1);
        
        expect(menuItems[0]).toHaveTextContent("2");
        expect(menuItems[1]).toHaveTextContent("3");
    });

    it("disables menu item when it is not clickable", () => {
        render(
            // 10px is too small to show any items
            <div style={{ width: 10 }}>
                <Breadcrumbs items={ITEMS} popoverProps={{ isOpen: true, usePortal: false }} />
            </div>,
            { container: containerElement }
        );
        
        const menuItems = containerElement.querySelectorAll(`.${Classes.MENU_ITEM}`);
        expect(menuItems.length).toBe(ITEMS.length);
        
        expect(menuItems[0]).toHaveClass(Classes.DISABLED);
    });

    it("calls currentBreadcrumbRenderer (only) for the current breadcrumb", () => {
        const spy = sinon.spy();
        render(<Breadcrumbs currentBreadcrumbRenderer={spy} items={ITEMS} minVisibleItems={ITEMS.length} />, {
            container: containerElement
        });
        
        expect(spy.calledOnce).toBe(true);
        expect(spy.calledWith(ITEMS[ITEMS.length - 1])).toBe(true);
    });

    it("does not call breadcrumbRenderer for the current breadcrumb when there is a currentBreadcrumbRenderer", () => {
        const spy = sinon.spy();
        render(
            <Breadcrumbs
                breadcrumbRenderer={spy}
                currentBreadcrumbRenderer={() => <div />}
                items={ITEMS}
                minVisibleItems={ITEMS.length}
            />,
            { container: containerElement }
        );
        
        expect(spy.callCount).toBe(ITEMS.length - 1);
        expect(spy.neverCalledWith(ITEMS[ITEMS.length - 1])).toBe(true);
    });

    it("calls breadcrumbRenderer", () => {
        const spy = sinon.spy();
        render(<Breadcrumbs breadcrumbRenderer={spy} items={ITEMS} minVisibleItems={ITEMS.length} />, {
            container: containerElement
        });
        
        expect(spy.callCount).toBe(ITEMS.length);
    });
});
