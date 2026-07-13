import { Router } from 'express';

const debugRouter = Router();

// Debug endpoint to see all headers
debugRouter.get('/headers', (req, res) => {
  console.log('[DEBUG] All headers received:', JSON.stringify(req.headers, null, 2));
  
  return res.json({
    success: true,
    headers: req.headers,
    hasAuthorization: !!req.headers.authorization,
    authorizationValue: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'NOT PRESENT'
  });
});

export default debugRouter;
