import axios, { AxiosResponse } from 'axios';

const BASE_URL = 'https://ai.varyshop.eu/api/v1/openai';
const API_KEY = 'QCTAMBC-023M75F-HW35RC4-PJREVDZ';
// const BASE_URL = 'https://api.groq.com/openai/v1';
// const API_KEY = 'gsk_twEdJ3dWniPp7sB
// Qw32VWGdyb3FYrBybT4APnLIcrGRhWKSkd7YS';

const extractJSON = (text: string) =>
  text.match(/```json\n([\s\S]*?)\n```/)?.[1]?.replace(/```/gs, '') || text;
type Content = { type: string; text?: string; image_url?: { url: string } }[];
export async function promptAI({
  model = 'groq',
  temperature = 0.7,
  system = '',
  prompt,
  attachments,
}: {
  model?: string;
  temperature?: number;
  system?: string;
  prompt: string;
  attachments?: string[];
}): Promise<AxiosResponse['data']> {
  const messages: { role: string; content: Content | string }[] = [];

  if (attachments) {
    const content: Content = [
      {
        type: 'text',
        text: prompt,
      },
    ];

    for (const attachment of attachments) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${attachment}`,
        },
      });
    }

    messages.push({
      role: 'user',
      content,
    });
  } else {
    messages.push(
      ...[
        {
          role: 'system',
          content: system,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    );
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  };

  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model,
      temperature,
      messages,
    },
    { headers },
  );

  if (response.data.error) {
    throw new Error(response.data.error.message);
  }

  return response.data; //.choices?.[0]?.message?.content || '';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function quertasAiPrompt({
  model = 'groq',
  temperature = 0.7,
  //   system = '',
  prompt,
  attachment,
}: {
  model?: string;
  temperature?: number;
  //   system?: string;
  prompt: string;
  attachment?: string;
}): Promise<AxiosResponse['data']> {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  };

  const { data } = await axios.post(
    `https://ai.varyshop.eu/api/v1/workspace/${model}/chat`,
    {
      model,
      temperature,
      message: prompt,
      mode: 'chat',
      attachments: attachment
        ? {
            name: 'image.jpg',
            mime: 'image/jpg',
            contentString: `data:image/jpeg;base64,${attachment}`,
          }
        : undefined,
    },
    { headers },
  );

  return data.textResponse;
}

export async function extractMapData(html: string) {
  const system = `Extract company data from Google Maps HTML. Return only JSON in this format:

    input:
    \`\`\`html
      <button class="CsEnBe" aria-label="Adresa: 12, Loketská 344, 360 06 Karlovy Vary"></button>
      ...
      <div class="rogA2c"><div class="Io6YTe">353 561 343</div></div>
      ...
      <div class="rogA2c"><div class="Io6YTe">baustav.cz</div></div>
      ...
      <div class="d4r55">Adam Záliš</div>
      <div class="kvMYJc" aria-label="5 hvězdiček"></div>
      <div class="MyEned"><span>Pěkně vypadá a i stavby...</span></div>
      ...

    \`\`\`
      output:
    \`\`\`json
      {
          "name": "BAU - STAV a.s.",
          "phone": "353561343",
          "website": "https://www.baustav.cz/",
          "email": "info@baustav.cz",
          "address": "12, Loketská 344, 360 06 Karlovy Vary",
          "rating": "4.3",
          "reviewsCount": "29",
          "industry": "stavební firma",
          "region": "Karlovy Vary",
          "reviews": [
              {
                  "rating": "5",
                  "message": "Pěkně vypadá a i stavby co staví šou bytelné podle předpisů a hlavě za přiměřenou cenu podle toho co se staví",
                  "name": "Adam Záliš"
              }
          ]
      }
      \`\`\`

      guidlines: 
      - Do not add any further comments.
      - OUTPUT MUST BE JSON.parse COMPATIBLE TO NOT CAUSE CRASH. 
      - THE VALUES MUST BE REAL DATA FROM ATTACHED IMAGE.
      - DO NOT ADD ANY VALUE IF YOU CANNOT FIND ONE. 
    `;
  const prompt = html;

  const response = await promptAI({ system, prompt, model: 'map-scraper' });
  console.dir(response, { depth: 100 });

  const value = extractJSON(response?.choices?.[0]?.message?.content || '') || '{}';

  return JSON.parse(value);
}

export async function extractMapScreenData(attachments: string[]) {
  const prompt = `Extract data from attached screenshot. Return only JSON in following format:
    \`\`\`json
      {
          "name": "BAU - STAV a.s.",
          "phone": "353561343",
          "website": "https://www.baustav.cz/",
          "email": "info@baustav.cz",
          "address": "12, Loketská 344, 360 06 Karlovy Vary",
          "rating": "4.3",
          "reviewsCount": "29",
          "industry": "stavební firma",
          "region": "Karlovy Vary",
          "reviews": [
              {
                  "rating": "5",
                  "message": "Pěkně vypadá a i stavby co staví šou bytelné podle předpisů a hlavě za přiměřenou cenu podle toho co se staví",
                  "name": "Adam Záliš"
              }
          ]
      }
      \`\`\`

      Do not add any further comments.

      GUIDLINES: 
      - OUTPUT MUST BE JSON.parse COMPATIBLE TO NOT CAUSE CRASH. 
      - THE VALUES MUST BE REAL DATA FROM ATTACHED IMAGE.
      - DO NOT ADD ANY VALUE IF YOU CANNOT FIND ONE. 
      `;

  const data = await promptAI({
    system: '',
    prompt,
    attachments,
    model: 'llama-3.2-11b-vision-preview',
  });
  //   const data = await quertasAiPrompt({
  //     prompt,
  //     attachment: attachments[0],
  //     model: 'programming',
  //   });

  console.log(data);

  let value: string = data?.choices?.[0]?.message?.content || '';
  value = value.replace(/```json(.*)```/g, '$1').trim();

  console.log(value);
  return JSON.parse(value);
}
