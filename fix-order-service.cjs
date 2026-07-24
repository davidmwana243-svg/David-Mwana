const fs = require('fs');
let code = fs.readFileSync('src/services/orderService.ts', 'utf8');

code = code.replace(
`  } catch (err) {
    console.error('Failed to update via API, falling back to direct db update', err);
    throw err;
  }
  
  // Only fall back if there was no token (should never happen if logged in)
  console.log('[CLIENT] Falling back to direct update for order', orderId);`,
`  } catch (err) {
    console.error('Failed to update via API, falling back to direct db update', err);
  }
  
  console.log('[CLIENT] Falling back to direct update for order', orderId);`
);

fs.writeFileSync('src/services/orderService.ts', code);
