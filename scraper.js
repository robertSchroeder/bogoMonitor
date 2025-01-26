const puppeteer = require('puppeteer');

(async () => {


    // Disabling infobars from the headless browser seems to make it a bit faster. 
    const browser = await puppeteer.launch({headless:false,args: ['--disable-infobars']});
    
    const page = await browser.newPage();

    // If this line is missing, the page detects our bot, throtless our requests, and eventually causes a timeout error. 

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    

    const url = 'https://www.publix.com/savings/weekly-ad/bogo?nav=header'; // Replace with the product URL

    // Block permissions for location
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(url, []);

    await page.goto(url, { waitUntil: 'domcontentloaded' }); 

    //Here we need to click on the button to enter store location.

    const storeAddressSelector = 'button[class="store-button ellipsis-width"]';

    page.click(storeAddressSelector);

    await page.waitForNavigation({ waitUntil: 'networkidle0' }); // very important! need to wait for dynamic content to load

    // Wait for the location input field to appear  
    const searchSelector = "input[placeholder='Enter a City, State, or Zip Code']";

    // Type the address into the input field
    const storeAddress = "121 SW 22nd Ave, Miami, FL 33135";
    console.log('Entering Store Location');

    //Wait for the iput element to appear
    await page.waitForSelector(searchSelector, {visible: true});

    await page.type(searchSelector, storeAddress);

    await page.keyboard.press("Enter");

    const chooseStoreSelector = 'button[data-qa-automation="button-Choose store"]';
    
    try {
      // Wait for the button to be available
      await page.waitForSelector(chooseStoreSelector, {
        visible: true,
        timeout: 5000
      });
    
      page.click(chooseStoreSelector);

  } catch (error) {
    console.error('Choose Store button not found:', error.message);
  }

   // Wait for the second page to fully load
   await page.waitForNavigation({ waitUntil: 'networkidle0' });
   console.log('Second page loaded.');

  // Selector for the "Load more" button
  const loadMoreButtonSelector = 'button[data-qa-automation="button-Load more"]';

// Basically an infinite loop that only breaks after the waitForSelector for the loadMoreButtonSelector throws a timeout error
// once we've clicked all of its instances and it stops appearing on the page.  

  while (true) {
    
    try {
      
      await page.waitForSelector(loadMoreButtonSelector, { visible: true, timeout: 10000 });

      await page.click(loadMoreButtonSelector);
    
    } catch (error) {
      
      break;
    }
  }

  // Define the product container and target product name
  const productContainerSelector = 'div.p-grid-item'; 

  const targetProductName = 'Fiji Natural Artesian Water'; // Replace with your target product name

  const allProducts = await page.$$eval(productContainerSelector, (productContainers) =>
    productContainers.map((product) => { 
      const nameElement = product.querySelector('div.content-wrapper > div.top-section > div > button > span');

      return nameElement ? nameElement.innerText.trim() : 'NO NAME IN CURRENT CONTAINER FOUND';
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

 await browser.close(); 
    
        

})();