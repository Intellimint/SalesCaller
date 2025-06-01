const { spawn } = require('child_process');

console.log('Starting FastAPI server...');

const python = spawn('uvicorn', ['main:app', '--host', '0.0.0.0', '--port', '5000'], {
  stdio: 'inherit'
});

python.on('close', (code) => {
  console.log(`FastAPI server exited with code ${code}`);
});

process.on('SIGINT', () => {
  python.kill('SIGINT');
});

process.on('SIGTERM', () => {
  python.kill('SIGTERM');
});