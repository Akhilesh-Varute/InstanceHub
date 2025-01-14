import { NextResponse } from 'next/server';
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";

const ec2Client = new EC2Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    // Add content-type validation
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ message: 'Content-Type must be application/json' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const { action, instanceId } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json({ message: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'list':
        const describeCommand = new DescribeInstancesCommand({});
        const { Reservations } = await ec2Client.send(describeCommand);
        const instances = Reservations.flatMap(reservation => 
          reservation.Instances.map(instance => ({
            id: instance.InstanceId,
            state: instance.State.Name,
            type: instance.InstanceType,
            name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed',
          }))
        );
        return NextResponse.json(instances);

      case 'start':
        if (!instanceId) {
          return NextResponse.json({ message: 'Instance ID is required for start action' }, { status: 400 });
        }
        const startCommand = new StartInstancesCommand({
          InstanceIds: [instanceId],
        });
        await ec2Client.send(startCommand);
        return NextResponse.json({ message: 'Instance starting' });

      case 'stop':
        if (!instanceId) {
          return NextResponse.json({ message: 'Instance ID is required for stop action' }, { status: 400 });
        }
        const stopCommand = new StopInstancesCommand({
          InstanceIds: [instanceId],
        });
        await ec2Client.send(stopCommand);
        return NextResponse.json({ message: 'Instance stopping' });

      default:
        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('AWS Error:', error);
    return NextResponse.json({ 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}