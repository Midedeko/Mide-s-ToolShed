import { test, expect } from '@playwright/test';

test('check text visibility', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForTimeout(2000); // give it time to load

    const toolName = page.locator('.tool-name');

    if (await toolName.count() === 0) {
        console.log("TOOL NAME ELEMENT NOT FOUND IN DOM");
        return;
    }

    const box = await toolName.boundingBox();
    console.log("BOUNDING BOX:", box);

    const computedStyle = await toolName.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            color: style.color,
            zIndex: style.zIndex,
            position: style.position,
            fontSize: style.fontSize,
            marginTop: style.marginTop,
            height: style.height,
            clipPath: style.clipPath,
            overflow: style.overflow
        };
    });
    console.log("COMPUTED STYLE:", computedStyle);

    const isVisible = await toolName.isVisible();
    console.log("PLAYWRIGHT IS_VISIBLE:", isVisible);

    const viewport = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    console.log("VIEWPORT:", viewport);

    await page.screenshot({ path: 'text_debug.png' });
});
