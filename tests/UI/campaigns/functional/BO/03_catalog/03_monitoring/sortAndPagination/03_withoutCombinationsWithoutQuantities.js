require('module-alias/register');

// Import expect from chai
const {expect} = require('chai');

// Import utils
const helper = require('@utils/helpers');
const basicHelper = require('@utils/basicHelper');
const testContext = require('@utils/testContext');
const files = require('@utils/files');

// Import common
const loginCommon = require('@commonTests/BO/loginBO');
const {importFileTest} = require('@commonTests/BO/advancedParameters/importFile');
const {bulkDeleteProductsTest} = require('@commonTests/BO/catalog/createDeleteProduct');

// Import pages
const dashboardPage = require('@pages/BO/dashboard');
const addProductPage = require('@pages/BO/catalog/products/add');
const monitoringPage = require('@pages/BO/catalog/monitoring');

const baseContext = 'functional_BO_catalog_monitoring_sortAndPagination_withoutCombinationsWithoutQuantities';

let browserContext;
let page;
let numberOfProductsIngrid = 0;
const tableName = 'no_qty_product_without_combination';
const prefixImportedProducts = 'todelete';

// Import Data
const {ProductsData} = require('@data/import/productsWithoutQuantities');

// Products file name
const productsFile = 'products.csv';

/*
Pre-condition
- Import list of products
Scenario
- Sort list of products without combinations and without available quantities in monitoring page
- Pagination next and previous
Post-condition
- Delete created products
 */
describe('BO - Catalog - Monitoring : Sort and pagination list of products without combinations '
  + 'and without available quantities', async () => {
  // Pre-condition: Import list of products
  importFileTest(productsFile, ProductsData.entity, baseContext);

  // before and after functions
  before(async function () {
    browserContext = await helper.createBrowserContext(this.browser);
    page = await helper.newTab(browserContext);
    // Create csv file with all products data
    await files.createCSVFile('.', productsFile, ProductsData);
  });

  after(async () => {
    await helper.closeBrowserContext(browserContext);
    // Delete products file
    await files.deleteFile(productsFile);
  });

  // 1 - Sort products without combinations and without available quantities
  describe('sort List of products without combinations and without available quantities', async () => {
    it('should login in BO', async function () {
      await loginCommon.loginBO(this, page);
    });

    it('should go to \'catalog > monitoring\' page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToMonitoringPage', baseContext);

      await addProductPage.goToSubMenu(
        page,
        dashboardPage.catalogParentLink,
        dashboardPage.monitoringLink,
      );

      const pageTitle = await monitoringPage.getPageTitle(page);
      await expect(pageTitle).to.contains(monitoringPage.pageTitle);

      numberOfProductsIngrid = await monitoringPage.resetAndGetNumberOfLines(page, tableName);
      await expect(numberOfProductsIngrid).to.be.at.least(1);
    });

    const sortTests = [
      {
        args: {
          testIdentifier: 'sortByIdDesc', sortBy: 'id_product', sortDirection: 'desc', isFloat: true,
        },
      },
      {args: {testIdentifier: 'sortByReferenceDesc', sortBy: 'reference', sortDirection: 'desc'}},
      {args: {testIdentifier: 'sortByReferenceAsc', sortBy: 'reference', sortDirection: 'asc'}},
      {args: {testIdentifier: 'sortByNameDesc', sortBy: 'name', sortDirection: 'desc'}},
      {args: {testIdentifier: 'sortByNameAsc', sortBy: 'name', sortDirection: 'asc'}},
      {args: {testIdentifier: 'sortByEnabledAsc', sortBy: 'active', sortDirection: 'asc'}},
      {args: {testIdentifier: 'sortByEnabledDesc', sortBy: 'active', sortDirection: 'desc'}},
      {
        args: {
          testIdentifier: 'sortByIdAsc', sortBy: 'id_product', sortDirection: 'asc', isFloat: true,
        },
      },
    ];

    sortTests.forEach((testSort) => {
      it(
        `should sort by '${testSort.args.sortBy}' '${testSort.args.sortDirection}' and check result`,
        async function () {
          await testContext.addContextItem(this, 'testIdentifier', testSort.args.testIdentifier, baseContext);

          let nonSortedTable = await monitoringPage.getAllRowsColumnContent(
            page,
            tableName,
            testSort.args.sortBy,
          );

          await monitoringPage.sortTable(
            page,
            tableName,
            testSort.args.sortBy,
            testSort.args.sortDirection,
          );

          let sortedTable = await monitoringPage.getAllRowsColumnContent(
            page,
            tableName,
            testSort.args.sortBy,
          );

          if (testSort.args.isFloat) {
            nonSortedTable = await nonSortedTable.map(text => parseFloat(text));
            sortedTable = await sortedTable.map(text => parseFloat(text));
          }

          const expectedResult = await basicHelper.sortArray(nonSortedTable, testSort.args.isFloat);

          if (testSort.args.sortDirection === 'asc') {
            await expect(sortedTable).to.deep.equal(expectedResult);
          } else {
            await expect(sortedTable).to.deep.equal(expectedResult.reverse());
          }
        },
      );
    });
  });

  // 2 - Pagination
  describe('Pagination next and previous', async () => {
    it('should change the items number to 10 per page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'changeItemsNumberTo10', baseContext);

      const paginationNumber = await monitoringPage.selectPaginationLimit(page, tableName, '10');
      expect(paginationNumber).to.contains('(page 1 / 2)');
    });

    it('should click on next', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'clickOnNext', baseContext);

      const paginationNumber = await monitoringPage.paginationNext(page, tableName);
      expect(paginationNumber).to.contains('(page 2 / 2)');
    });

    it('should click on previous', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'clickOnPrevious', baseContext);

      const paginationNumber = await monitoringPage.paginationPrevious(page, tableName);
      expect(paginationNumber).to.contains('(page 1 / 2)');
    });

    it('should change the items number to 20 per page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'changeItemsNumberTo50', baseContext);

      const paginationNumber = await monitoringPage.selectPaginationLimit(page, tableName, '20');
      expect(paginationNumber).to.contains('(page 1 / 1)');
    });
  });

  // Post-condition: Delete created products
  bulkDeleteProductsTest(prefixImportedProducts, baseContext);
});
