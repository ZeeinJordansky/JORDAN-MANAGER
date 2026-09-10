const { AsyncLocalStorage } = require('async_hooks');
const als = new AsyncLocalStorage();
als.run({ id: 123 }, () => {
  setTimeout(() => {
    console.log(als.getStore());
  }, 10);
});
