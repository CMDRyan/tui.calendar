import { expect, test } from '@playwright/test';

import type { MockedWeekViewEvents } from '@stories/mocks/types';

import { mockWeekViewEvents } from '../../stories/mocks/mockWeekViewEvents';
import { WEEK_VIEW_DUPLICATE_EVENTS_PAGE_URL, WEEK_VIEW_PAGE_URL } from '../configs';
import { getBoundingBox, getTimeEventSelector } from '../utils';

test.beforeEach(async ({ page }) => {
  await page.goto(WEEK_VIEW_PAGE_URL);
});

const targetEvents = mockWeekViewEvents.filter(({ isAllday }) => !isAllday);
targetEvents.forEach(({ title }) => {
  test(`Click event: show popup when ${title} is clicked`, async ({ page }) => {
    // Given
    const targetEventSelector = getTimeEventSelector(title);
    const targetEventLocator = page.locator(targetEventSelector).last();
    const targetEventBoundingBox = await getBoundingBox(targetEventLocator);

    // When
    await page.mouse.move(targetEventBoundingBox.x + 2, targetEventBoundingBox.y + 2);
    await page.mouse.down();
    await page.mouse.up();

    // Then
    const detailPopup = page.locator('css=[role=dialog]');
    await expect(detailPopup).toBeVisible();
  });
});

test.describe('Collapse duplicate events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WEEK_VIEW_DUPLICATE_EVENTS_PAGE_URL);
  });

  const collapsedEvent = mockWeekViewEvents.find(
    ({ title }) => title === 'duplicate event'
  ) as MockedWeekViewEvents;

  test('When clicking the collapsed duplicate event, it should be expanded.', async ({ page }) => {
    // Given
    const collapsedEventLocator = page.locator(getTimeEventSelector(collapsedEvent.title));
    const { x, y, width: widthBeforeClick } = await getBoundingBox(collapsedEventLocator);

    // When
    await page.mouse.move(x + 2, y + 2);
    await page.mouse.down();
    await page.mouse.up();

    // Then
    const { width: widthAfterClick } = await getBoundingBox(collapsedEventLocator);
    expect(widthAfterClick).toBeGreaterThan(widthBeforeClick);
  });

  const otherEvents = mockWeekViewEvents.filter(({ title }) => {
    return (
      title === 'duplicate event with durations' || // duplicate event in the same duplicate event group
      title === 'duplicate event 2' || // duplicate event but not in the same duplicate event group
      title === 'short time event' // normal event
    );
  });
  otherEvents.forEach((otherEvent) => {
    test(`When clicking the other event (title: ${otherEvent.title}), the previous expanded event should be collapsed.`, async ({
      page,
    }) => {
      // Given
      const collapsedEventLocator = page.locator(getTimeEventSelector(collapsedEvent.title));
      const { x, y, width: widthBeforeClick } = await getBoundingBox(collapsedEventLocator);

      // When
      await page.mouse.move(x + 2, y + 2);
      await page.mouse.down();
      await page.mouse.up();

      const otherEventLocator = page.locator(getTimeEventSelector(otherEvent.title));
      const {
        x: otherX,
        y: otherY,
        width: otherWidthBeforeClick,
      } = await getBoundingBox(otherEventLocator);
      await page.mouse.move(otherX + 2, otherY + 2);
      await page.mouse.down();
      await page.mouse.up();

      // Then
      const { width: widthAfterClick } = await getBoundingBox(collapsedEventLocator);
      const { width: otherWidthAfterClick } = await getBoundingBox(otherEventLocator);
      expect(widthAfterClick).toBeCloseTo(widthBeforeClick, -1);

      if (otherEvent.title.includes('duplicate')) {
        // if the next clicked event is duplicate, it should be expanded.
        expect(otherWidthAfterClick).toBeGreaterThan(otherWidthBeforeClick);
      }
    });
  });

  test('When clicking one day of a two-day duplicate event, the other day also should be expanded.', async ({
    page,
  }) => {
    // Given
    const longCollapsedEventTitle = 'duplicate long event';
    const longCollaspedEventLocator = page.locator(getTimeEventSelector(longCollapsedEventTitle));
    const firstDayLocator = longCollaspedEventLocator.first();
    const lastDayLocator = longCollaspedEventLocator.last();
    const { x, y, width: widthBeforeClick } = await getBoundingBox(firstDayLocator);

    // When
    await page.mouse.move(x + 2, y + 2);
    await page.mouse.down();
    await page.mouse.up();

    // Then
    const { width: widthAfterClick } = await getBoundingBox(firstDayLocator);
    const { width: widthAfterClickOnLastDay } = await getBoundingBox(lastDayLocator);
    expect(widthAfterClick).toBeGreaterThan(widthBeforeClick);
    expect(widthAfterClickOnLastDay).toBeCloseTo(widthAfterClick);
  });
});
