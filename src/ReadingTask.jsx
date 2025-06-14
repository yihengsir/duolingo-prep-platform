import React from 'react';

const ReadingTask = () => {
  const sentence = [
    { type: 'text', content: 'Maria gently placed her hand on the bird’s wing, feeling its delicate bones and soft feathers.' },
    { type: 'text', content: ' With ' },
    { type: 'blank', length: 4 },
    { type: 'text', content: ' a look of ' },
    { type: 'blank', length: 2 },
    { type: 'text', content: ' determination in her ' },
    { type: 'blank', length: 4 },
    { type: 'text', content: ', she ' },
    { type: 'blank', length: 4 },
    { type: 'text', content: ', “I ' },
    { type: 'blank', length: 4 },
    { type: 'text', content: ' do every' },
    { type: 'blank', length: 7 },
    { type: 'text', content: ' I can ' },
    { type: 'blank', length: 2 },
    { type: 'text', content: ' help ' },
    { type: 'blank', length: 3 },
    { type: 'text', content: ', little one.” And with that, she carefully began to treat the injured creature.' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-6 text-gray-800 font-sans">
      <div className="text-blue-700 text-lg font-bold mb-2">02:58</div>
      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-md">
        <h1 className="text-center text-2xl font-bold text-blue-800 leading-snug mb-2">
          Duolingo DET<br />Prep - 阅读并补全
        </h1>
        <h2 className="text-center text-lg font-semibold mb-4">A Gentle Touch, A Powerful Impact</h2>
        <p className="leading-7 text-[16px]">
          {sentence.map((part, idx) => {
            if (part.type === 'text') {
              return <span key={idx}>{part.content} </span>;
            } else {
              return (
                <span key={idx} className="inline-block w-8 border-b border-gray-400 mx-0.5 text-center">
                  &nbsp;
                </span>
              );
            }
          })}
        </p>
      </div>
      <div className="flex justify-around w-full max-w-md mt-6 space-x-4">
        <button className="flex-1 py-2 rounded-full bg-gray-400 text-white hover:bg-gray-500">检查答案</button>
        <button className="flex-1 py-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600">重做</button>
        <button className="flex-1 py-2 rounded-full bg-green-600 text-white hover:bg-green-700">下一题</button>
      </div>
    </div>
  );
};

export default ReadingTask;