//IMPORTANDO BIBLIOTECAS
import OpenAI from "openai"
import { Message, Whatsapp, create } from "venom-bot"

import { openai } from "./lib/openai"
import { redis } from "./lib/redis"

import { initPrompt } from "./utils/initPrompt"

import * as fs from 'fs';
import * as path from 'path';
import { exec, ExecException } from 'child_process';

// Criando interfacer do administrados para o gpt e a função de comunicação com GPT
// https://wa.me/+5512982754592
interface CustomerChat {
  status?: "open" | "closed"
  ativo: string
  orderCode: string
  chatAt: string
  customer: {
    name: string
    phone: string
    phoneAtgpt: string
    numbProduct: string
  
  }
  messages: OpenAI.Chat.CreateChatCompletionRequestMessage[]
  orderSummary?: string
}

async function completion(
  messages: OpenAI.Chat.CreateChatCompletionRequestMessage[]
): Promise<string | null> {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    max_tokens: 256,
    messages,
  })

  return completion.choices[0].message?.content
}

// Criando a instancia WhatsApp com Venom-bot

create({
  session: "serpens-gpt", 
  headless: false // default: true on prod
  
})
  .then(async (client: Whatsapp) => await start(client))
  .catch((err) => {
    console.log(err)
  })

// Função Startadora do bot e gerenciadora do corpo de execução
async function start(client: Whatsapp) {
  //Definindo variaveis estaticas
  const storeName = "Pisante Calçados"
  let readingPhone = ''  
  let imageToPass = ''
  const myUsersClientToday: { id: number; value: string }[] = [];
  const myArray: string[] = ["18", "19","20","21","22","23","24","25","26","27","28","29","30","31","32","33", "34","35","36","37","38","39","40","41","42","43"];

  //Chamada client Bot HOT == QUANDO O USUARIO NOS ENVIA A MENSAGEM E NOS AGIMOS A PARTIR DISSO
  client.onMessage(async (message: Message) => {
    if (!message.body || message.isGroupMsg || message.body === undefined) return
    //Variaveis dinamicas
    const customerPhone = `+${message.from.replace("@c.us", "")}`;
    const customerAdmPhone = message.from;     
    const customerName = message.author;
    const customerKey = `customer:${customerPhone}:chat`;
    const orderCode = `#sk-${("00000" + Math.random()).slice(-5)}`;
    const lastChat = JSON.parse((await redis.get(customerKey)) || "{}");

    const customerChat: CustomerChat =
    lastChat?.status === "open"
      ? (lastChat as CustomerChat)
      : {
          status: "open",
          ativo: "",
          orderCode,
          chatAt: new Date().toISOString(),
          customer: {
            name: customerName,
            phone: customerPhone,
            phoneAtgpt: "",
            numbProduct: ""
          },
          messages: [
            {
              role: "system",
              content: initPrompt(storeName, orderCode),
            },
          ],
          orderSummary: "",
        }

    console.debug(customerPhone, "👤", message.body)    

    if (message.mimetype && message.mimetype.includes('image')) {   
      
      
      const imageName = `${Date.now()}.jpg`; // Generate a unique filename
      const imageToPassFornecedor:string = path.join(__dirname, 'comparatives', imageName);
      imageToPass = path.join(__dirname, 'comparatives', imageName);
      console.log(`Image saved: ${imageToPassFornecedor}`);
   
      // Download and save the image
      const buffer = await client.decryptFile(message);
      fs.writeFileSync(imageToPassFornecedor, buffer);

      customerChat.customer.phoneAtgpt = message.from; 
      customerChat.ativo = "true";   

      customerChat.messages.push({
        role: "user",
        content: "Acabei de te enviar a foto do produto que eu escolhi",
      })

      const content =
        "Estamos aguardando a confimação do produto no estoque!" || "Não entendi..."

      customerChat.messages.push({
        role: "assistant",
        content,
      })
      
      redis.set(customerKey, JSON.stringify(customerChat))       

      // Replace 'pythonScript.py' with the path to your Python script
      // const pythonOutput = await executePythonScript(customerChat.customer.phoneAtgpt);
      // Now you can use pythonOutput and perform the next action here
      // console.log('Saída do Python:', JSON.parse(pythonOutput));

      // const pathComparatives = JSON.parse(pythonOutput);
      
      if(myArray.includes(message.caption)){

        await client
        .sendText(customerChat.customer.phoneAtgpt, 'Estamos entrando em contato com nosso Fornecedor! Aguarde um momento por favor 😁')
        .then((result) => {
          console.log('Result: '); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });          

        await client
        .sendImage(
          '55129911642370@c.us',
          imageToPassFornecedor,
          '👟',
          `Olá tudo bem ? estou com o pedido de numero ${orderCode}. Preciso que verifique se ele existe na numeração ${message.caption}\nEnvie *Confirmado* caso esse produto exista no estoque!`
        )
        .then((result: any) => {
          console.log('Result: '); // return object success
        })
        .catch((erro: any) => {
          console.error('Error when sending: ', erro); // return object error
        });               
      }else{

        await client 

        await client
        .sendImage(
          readingPhone,
          "/home/oem/Documentos/Bots/Serpens/food-gpt/src/WhatsApp Image 2023-09-15 at 15.00.02.jpeg",
          '👟',
          `Opa tivemos um engano.\nÉ so seguir o exemplo acima e me enviar a foto do produto novamente com a numeração desejada na legenda da foto ok ?!😁`
        )
        .then((result: any) => {
          console.log('Result: '); // return object success
        })
        .catch((erro: any) => {
          console.error('Error when sending: ', erro); // return object error
        });      
                
        
      }

    }else if (message.body.toLowerCase() === "confirmado" || message.body.toLowerCase() === "confirmar" && message.from && message.from === "55129911642370@c.us" && message.isGroupMsg === false){

      const customerChat: CustomerChat =
      lastChat?.ativo === "true"
        ? (lastChat as CustomerChat)
        : {
            status: "open",
            ativo: "",
            orderCode,
            chatAt: new Date().toISOString(),
            customer: {
              name: customerName,
              phone: customerPhone,
              phoneAtgpt: "",
              numbProduct: ""
            },
            messages: [
              {
                role: "system",
                content: initPrompt(storeName, orderCode),
              },
            ],
            orderSummary: "",
          }

      await client
      .sendText("55129911642370@c.us", 'Ok, obrigado 😁')
      .then((result) => {
        console.log('Result: '); //return object success
      })
      .catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
      }); 

      await client
      .sendImage(
        message.from,
        imageToPass,
        '👟',
        `Maravilha!! 😎\nNos temos seu produto em nosso estoque, confirme se é esse produto mesmo e envie *continuar* para seguirmos no atendimento.`
      )
      .then((result: any) => {
        console.log('Result: '); // return object success
      })
      .catch((erro: any) => {
        console.error('Error when sending: ', erro); // return object error
      });            
      
      customerChat.ativo = "falso";

      customerChat.messages.push({
        role: "user",
        content: "O produto existe no estoque.",
      }) 
      const content =
        "Que otimo!! Ainda temos seu produto no estoque, gostaria de continuar comprando ?" || "Não entendi..."

      customerChat.messages.push({
        role: "assistant",
        content,
      })

      console.debug(customerPhone, "🤖", content)   

      redis.set(customerKey, JSON.stringify(customerChat))       

    }else if (message.body.toLowerCase() === "continuar"){
      readingPhone = message.from      

      customerChat.messages.push({
        role: "user",
        content: "Eu desejo continuar comprando.",
      }) 

      const content =
        (await completion(customerChat.messages)) || "Não entendi..."

      customerChat.messages.push({
        role: "assistant",
        content,
      })

      redis.set(customerKey, JSON.stringify(customerChat))    


      console.debug(customerPhone, "🤖", content)

      await client.sendText(message.from, content)

      
    }else if (message.body.toLowerCase() === "/entregas" || message.body.toLowerCase() === "/entrega" && message.isGroupMsg === false){

      await client
      .sendImage(
        message.from,
        "/home/oem/Documentos/Bots/Serpens/food-gpt/src/calcados/adidas 34 ao 39 (5).jpg",
        '👟',
        `
        1. **Entrega 1** 📦
           - *Endereço*: Rua das Flores, 123
           - *Bairro*: Jardim Primavera
           - *Bairro*: #
           - *Cidade*: Cruzeiro
           - Numero do produto*: 41
           - *Estado*: São Paulo
           - *Responsável*: Maria Silva
           - *Valor dos Itens*: R$ 130,00
           - *Resumo*: Entrega realizada com sucesso para Maria Silva em Cruzeiro.\n\n
        `
      )
      .then((result: any) => {
        console.log('Result: '); // return object success
      })
      .catch((erro: any) => {
        console.error('Error when sending: ', erro); // return object error
      });   
      
      await client
      .sendImage(
        message.from,
        "/home/oem/Documentos/Bots/Serpens/food-gpt/src/calcados/WhatsApp Image 2023-07-26 at 15.36.38 (4).jpg",
        '👟',
        `
        2. *Entrega 2* 📦
           - *Endereço*: Avenida da Paz, 456
           - *Bairro*: Centro
           - *Cidade*: Lorena
           - *Numero do produto*: 39    
           - *Estado*: São Paulo
           - *Responsável*: João Santos
           - *Valor dos Itens*: R$ 130,00
           - *Resumo*: João Santos recebeu seus produtos em Lorena.\n\n
        `
      )
      .then((result: any) => {
        console.log('Result: '); // return object success
      })
      .catch((erro: any) => {
        console.error('Error when sending: ', erro); // return object error
      });   
      
      await client
      .sendImage(
        message.from,
        "/home/oem/Documentos/Bots/Serpens/food-gpt/src/calcados/WhatsApp Image 2023-08-23 at 18.44.44.jpg",
        '👟',
        `
        3. *Entrega 3* 📦
           - *Endereço*: Rua das Estrelas, 789
           - *Bairro*: Vila Celestial
           - *Cidade*: Canas
           - *Numero do produto*: 40           
           - *Estado*: São Paulo
           - *Responsável*: Ana Rodrigues
           - *Valor dos Itens*: R$ 130,00
           - *Resumo*: Entrega concluída com sucesso para Ana Rodrigues em Canas.\n\n
        `
      )
      .then((result: any) => {
        console.log('Result: '); // return object success
      })
      .catch((erro: any) => {
        console.error('Error when sending: ', erro); // return object error
      });   
      
      await client
      .sendText(message.from, 'Lista de entregas *HOJE*! 🚚')
      .then((result) => {
        console.log('Result: '); //return object success
      })
      .catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
      });         
      
    }else if (message.from !== "55129911642370@c.us" && message.body.toLowerCase() !== "/entregas" && message.isGroupMsg === false){
      readingPhone = message.from

      customerChat.messages.push({
        role: "user",
        content: message.body,
      })

      const content =
        (await completion(customerChat.messages)) || "Não entendi..."

      customerChat.messages.push({
        role: "assistant",
        content,
      })

      console.debug(customerPhone, "🤖", content)

      await client.sendText(message.from, content)

      redis.set(customerKey, JSON.stringify(customerChat))
    }


  })
}

const executePythonScript = async (imagePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const pythonProcess = exec(
      `/bin/python3 /home/andre/Documentos/Bot-Sales/python_lab/verify_check_img.py ${imagePath}`,
      (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(`Erro: ${error}`);
          reject(error); // Rejeita a Promise em caso de erro
        } else {
          resolve(stdout); // Resolve a Promise com a saída do Python em caso de sucesso

          return stdout;
        }
      }
    );

    pythonProcess.on('exit', (code: number) => {
      if (code !== 0) {
        // Se o código de saída não for zero, algo deu errado na execução
        reject(new Error(`Erro na execução do Python, código de saída: ${code}`));
      }
    });

  })};
