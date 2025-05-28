require('dotenv').config();
const puppeteer = require('puppeteer'); 
const Mailjet = require('node-mailjet');

const mailJetApiKey = process.env.mailjetApiKey;
const mailjetSecreteKey = process.env.mailjetSecreteKey;
const emailAddress = process.env.emailAddress;

const mailjet = Mailjet.apiConnect(
  mailJetApiKey, 
  mailjetSecreteKey
);

async function sendEmailNotification(productName) {
  try {
      await mailjet.post("send", { version: "v3.1" }).request({
          Messages: [
              {
                  From: {
                      Email: emailAddress,
                      Name: "Publix BOGO Notifier"
                  },
                  To: [
                      {
                          Email: emailAddress,
                          Name: "User"
                      }
                  ],
                  Subject: `🔔 Alert: ${productName} is on Sale!`,
                  TextPart: `The product "${productName}" is now available on Publix's BOGO deals.`,
              }
          ]
      });
      console.log(`✅ Email notification sent for ${productName}`);
  } catch (error) {
      console.error('❌ Error sending email:', error.message);
  }
}

(async () => { //self-invoking ,asynchronous, arrow function that runs the code below. 

    const storeAddress = "121 SW 22nd Ave, Miami, FL 33135";
    const targetProductName = 'Weber Seasoning'; // Replace with your target product name

    // Disabling infobars from the headless browser seems to make it a bit faster. 
    const browser = await puppeteer.launch({headless:false, defaultViewport: null,args: ['--disable-infobars','--window-size=1440,900']});

    //For running with VM, which can't easily run a browser instance w/ sandboxing,so we use the following on it:
     
    //const browser = await puppeteer.launch({headless:true,args: ['--disable-infobars','--no-sandbox', '--disable-setuid-sandbox']});

    // note: Remember to remove the previous "browser" declaration when implementing the above on VM.
    
    const page = await browser.newPage();

    // If this line is missing, the page detects our bot, throtless our requests, and eventually causes a timeout error. 

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    

    const url = 'https://www.publix.com/savings/weekly-ad/bogo?nav=header'; // Replace with the product URL

    // Block permissions for location
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(url, []);

    // waits until the domcontentloaded event occurs; gives it additional wait time for it to occur.  
   await page.goto(url, { waitUntil: 'networkidle0' });
    
    /*Publix seems to alternate between different web designs from time to time.

    In the version of the code below, they'll automatically assign a store location; which requires us to click on a specific button to enter the address of the desired store.
    
    The code below may be commented out depending on the above. 
    
    */

    const storeAddressSelector = 'button.p-store-location-button.button--store-selected';

    await page.waitForSelector(storeAddressSelector, { visible: true }); // ensures it exists and is visible
    await page.click(storeAddressSelector); // waits for the click to complete
    //await page.waitForNavigation({ waitUntil: 'networkidle0' }); // very important! need to wait for dynamic content to load
//await page.waitForNavigation({ waitUntil: 'domcontentloaded'});
    // Wait for the location input field to appear  
    
    const searchSelector = "input[placeholder='Enter a City, State, or Zip Code']";

    // Type the address into the input field
    console.log('Entering Store Location');

    //Wait for the iput element to appear
    await page.waitForSelector(searchSelector, {visible: true});

    await new Promise(resolve => setTimeout(resolve, 500));

    await page.click(searchSelector);

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
   console.log('Products page loaded.');

  // Selector for the "Load more" button
  const loadMoreButtonSelector = 'button[data-qa-automation="button-Load more"]';

// Basically an infinite loop that only breaks after the waitForSelector for the loadMoreButtonSelector throws a timeout error
// once we've clicked all of its instances and it stops appearing on the page.  

  while (true) {
    
    try {
      
      await page.waitForSelector(loadMoreButtonSelector, { visible: true, timeout: 10000 });

      await page.click(loadMoreButtonSelector);

      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      console.log('loadMore button selected');
    
    } catch (error) {
      
      break;
    }
  }

  // Define the product container and target product name
  const productContainerSelector = 'div.p-grid-item'; 

  // await page.waitForSelector(productContainerSelector, { visible: true });
  //await page.waitForNavigation({ waitUntil: 'networkidle0' });
  

 
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
    console.log(`Product "${targetProductName}" is available! Sending email...`);
    await sendEmailNotification(targetProductName);

  } else {
    console.log(`Product "${targetProductName}" was not found on the page.`);

  }

 await browser.close(); 
    
        
})();