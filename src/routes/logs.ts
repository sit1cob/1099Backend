import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const logsRouter = Router();

// GET /api/logs - Get PM2 logs (requires admin access)
logsRouter.get('/', async (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines as string) : 100;
    const appName = req.query.app || 'job-board-api';
    
    // Security: Add authentication check here
    // For now, this is open - YOU SHOULD ADD AUTH!
    
    const { stdout, stderr } = await execAsync(`pm2 logs ${appName} --lines ${lines} --nostream`);
    
    return res.json({
      success: true,
      data: {
        logs: stdout || stderr,
        lines: lines,
        app: appName,
      }
    });
  } catch (err: any) {
    console.error('[Logs] Error fetching logs:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch logs'
    });
  }
});

// GET /api/logs/errors - Get only error logs
logsRouter.get('/errors', async (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines as string) : 50;
    const appName = req.query.app || 'job-board-api';
    
    const { stdout, stderr } = await execAsync(`pm2 logs ${appName} --err --lines ${lines} --nostream`);
    
    return res.json({
      success: true,
      data: {
        errors: stderr || stdout,
        lines: lines,
        app: appName,
      }
    });
  } catch (err: any) {
    console.error('[Logs] Error fetching error logs:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch error logs'
    });
  }
});

// GET /api/logs/status - Get PM2 process status
logsRouter.get('/status', async (req, res) => {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    
    return res.json({
      success: true,
      data: {
        processes: processes.map((p: any) => ({
          name: p.name,
          status: p.pm2_env.status,
          uptime: p.pm2_env.pm_uptime,
          restarts: p.pm2_env.restart_time,
          memory: p.monit.memory,
          cpu: p.monit.cpu,
        }))
      }
    });
  } catch (err: any) {
    console.error('[Logs] Error fetching status:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch status'
    });
  }
});
