// src/app/api/ssh/route.js
import { EC2Client, GetInstanceDataCommand } from "@aws-sdk/client-ec2";
import { WebSocketServer } from 'ws';
import { SSHClient } from 'ssh2';
import { NextResponse } from 'next/server';

const ec2Client = new EC2Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// This is a WebSocket route
export function GET(request) {
  if (!process.env.EC2_KEY_PATH) {
    return new NextResponse('EC2 key not configured', { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get('instanceId');

  if (!instanceId) {
    return new NextResponse('Instance ID required', { status: 400 });
  }

  // Upgrade the HTTP connection to WebSocket
  const { socket, response } = Upgrade.upgrade(request);
  
  const ssh = new SSHClient();

  // Get instance data
  ec2Client.send(new GetInstanceDataCommand({ InstanceId: instanceId }))
    .then(data => {
      ssh.connect({
        host: data.Instance.PublicDnsName,
        username: 'ec2-user', // or ubuntu, depending on your AMI
        privateKey: require('fs').readFileSync(process.env.EC2_KEY_PATH)
      });
    })
    .catch(err => {
      socket.write('Failed to get instance data: ' + err.message);
      socket.end();
    });

  ssh.on('ready', () => {
    ssh.shell((err, stream) => {
      if (err) {
        socket.write('Failed to start shell: ' + err.message);
        socket.end();
        return;
      }

      // Pipe WebSocket to SSH and vice versa
      socket.pipe(stream).pipe(socket);

      stream.on('close', () => {
        ssh.end();
        socket.end();
      });
    });
  });

  ssh.on('error', (err) => {
    socket.write('SSH Error: ' + err.message);
    socket.end();
  });

  return response;
}