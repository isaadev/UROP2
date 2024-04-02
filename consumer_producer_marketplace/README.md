# How to run 

- Clone the repo and make sure to run `npm i` in the terminal to install the new packages (such as the gpt LLM package)
- And add your own gpt api key in replacement of the `process.env.OPENAI_API_KEY` in `callbacks.js`. 
- Make sure not to make a .env file and extract the api key from there, rather just put the your api key into the callbacks.js file while running.
- Let me know if there is any issues or questions!

- Prompt:
```
"You currently have " +
        wallet +
        " dollars. Each product costs " +
        productPrice +
        " dollars. There are only " +
        remainingStock +
        " products left. You cannot buy more products than this amount. The producer has advertised the product as " +
        productAdQuality +
        " quality, but it is actually " +
        productQuality +
        " quality." +
        " Previously, the producer has lied " +
        consumerAgent.cheatedHistory.filter(Boolean).length +
        " times about the product quality. Given these constraints, how many products would you like to buy? Remember, you cannot buy more than " +
        remainingStock +
        ". But you can buy less than" +
        remainingStock +
        ". Answer with just a number, such as '5'."```
