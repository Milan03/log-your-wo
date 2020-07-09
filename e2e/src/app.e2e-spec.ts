import { AppPage } from './app.po';
import { browser, logging } from 'protractor';

describe('log-your-wo App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display log-your-wo in h1 tag', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('log-your-wo');
  });

  afterEach(async () => {
    // Assert that there are no errors emitted from the browser
    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    expect(logs).not.toContain(jasmine.objectContaining({
      level: logging.Level.SEVERE,
    } as logging.Entry));
  });
});
