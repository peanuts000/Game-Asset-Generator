import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { url, apiKey, payload } = body;

    if (!url || !apiKey) {
      return NextResponse.json({ error: 'Missing endpoint url or apiKey' }, { status: 400 });
    }

    // Special handling for Aliyun DashScope (Wanx models) which require async Task polling
    const isAliyun = url.includes('dashscope') || (payload.model && payload.model.startsWith('wanx'));
    
    if (isAliyun) {
      // 1. Submit async task
      const aliyunUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
      const submitRes = await fetch(aliyunUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify({
          model: payload.model || 'wanx2.1-t2i-turbo',
          input: { prompt: payload.prompt }
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.output?.task_id) {
        return NextResponse.json({ error: submitData.message || 'Failed to submit Aliyun task' }, { status: 500 });
      }

      const taskId = submitData.output.task_id;
      
      // 2. Poll until complete
      for (let i = 0; i < 30; i++) { // Max wait 60s
        await new Promise(r => setTimeout(r, 2000));
        
        const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        const pollData = await pollRes.json();
        const status = pollData.output?.task_status;
        
        if (status === 'SUCCEEDED') {
          // Normalize to OpenAI format for frontend
          return NextResponse.json({
            data: [ { url: pollData.output.results[0].url } ]
          }, { status: 200 });
        } else if (status === 'FAILED' || status === 'UNKNOWN') {
           return NextResponse.json({ error: pollData.output?.message || 'Aliyun task failed' }, { status: 500 });
        }
      }
      return NextResponse.json({ error: 'Task timeout' }, { status: 504 });
    }

    // Standard OpenAI compatible request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Non-JSON response from API:", responseText);
      return NextResponse.json({ error: `Received non-JSON response: ${responseText.substring(0, 500)}` }, { status: response.status === 200 ? 500 : response.status });
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
