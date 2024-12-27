/*
Structure for selector syntax: 

"element[property='value']"

- really need to focus on understanding the "Load more" button clicking process, which is the most complext part 
  of this script. 

*/

const puppeteer = require('puppeteer');

(async () => {

    const browser = await puppeteer.launch({headless:false,args: ['--disable-infobars'],});
    const page = await browser.newPage();

    const url = 'https://www.publix.com/savings/weekly-ad/bogo?nav=header'; // Replace with the product URL

    // Block permissions for location
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(url, []);

    await page.goto(url, { waitUntil: 'domcontentloaded' }); 

    // Wait for the location input field to appear  
    await page.waitForSelector("input[placeholder='Enter a City, State, or Zip Code']", { timeout: 60000 });

    // Type the address into the input field
    const storeAddress = "1616 Cape Coral Pkwy W # 5, Cape Coral, FL 33914";
    await page.type("input[placeholder='Enter a City, State, or Zip Code']", storeAddress);

    await page.keyboard.press("Enter");
    
    try {
      // Wait for the button to be available
      await page.waitForSelector('button[data-qa-automation="button-Choose store"]', {
        visible: true,
      });

      console.log('Choose Store button found. Clicking...');
    
    // Click the button
    // Puppeteer tries to click before the button is loaded, the browser crashes. 
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('button[data-qa-automation="button-Choose store"]'),
    ]);
    console.log('Button clicked successfully!');
  } catch (error) {
    console.error('Choose Store button not found:', error.message);
  }

  //need to have it click on "Load more, each time it's pressent on the page."

   // Wait for the second page to fully load
   await page.waitForNavigation({ waitUntil: 'networkidle0' });
   console.log('Second page loaded.');

  // Selector for the "Load more" button
  const loadMoreButtonSelector = 'div.button-container button.p-button.button--default.button--sm.button--secondary';

  // Continuously click the "Load more" button until it no longer appears
  let previousProductCount = 0;

  //Need to know if for the code below, instead of specifying a wait time rigidly, we can just wait until
  // all current page items are loaded; but that should be after I understand the code in it'a current state. 

  while (true) {
    try {
      // Wait for the "Load more" button to appear
      //(what if their connection is slow?) is there no way to just check after everything in the page has fully loaded?
      await page.waitForSelector(loadMoreButtonSelector, { visible: true, timeout: 5000 });
      console.log('Load more button found. Clicking...');

      // Click the "Load more" button
      await page.click(loadMoreButtonSelector);

      // Wait for the number of product containers to increase
      await page.waitForFunction(
        (selector, prevCount) => {
          const currentCount = document.querySelectorAll(selector).length;
          return currentCount > prevCount;
        },
        { timeout: 10000 }, // Adjust timeout if necessary
        'div.p-grid-item',
        previousProductCount
      );

      // Update the count of loaded products
      previousProductCount = await page.$$eval('div.p-grid-item', (products) => products.length);
      console.log(`Current product count: ${previousProductCount}`);
    } catch (error) {
      // If the button is not found or no more products load, exit the loop
      console.log('No more products to load or "Load more" button no longer appears.');
      break;
    }
  }
  

  // Define the product container and target product name
  const productContainerSelector = 'div.p-grid-item'; 

  const pageContent = await page.content();
  console.log('Page content loaded for debugging.');

  const targetProductName = "Quaker Cap'N Crunch Cereal"; // Replace with your target product name

  const allProducts = await page.$$eval(productContainerSelector, (productContainers) =>
    productContainers.map((product) => {
      const nameElement = product.querySelector(
        'div.content-wrapper > div.top-section > div > button > span'
      );
      return nameElement ? nameElement.innerText.trim() : 'NO NAME FOUND';
    })
  );

  console.log('Products found:', allProducts);

  // Check if the target product exists
  const isProductFound = allProducts.includes(targetProductName);

  if (isProductFound) {
    console.log(`Product "${targetProductName}" exists on the page.`);
  } else {
    console.log(`Product "${targetProductName}" was not found on the page.`);
  }

 // await browser.close();
    
        

})();