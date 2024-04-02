import { ClassicListenersCollector } from "@empirica/core/admin/classic";
// import { getconsumerAgentFromId } from "../../client/src/strategie/ConsumerAgent.js"

export const Empirica = new ClassicListenersCollector();

const fs = require("fs");
const path = require("path");

const folderPath = "/";
const fileName = "choices_consumer.json";
const filePath = path.join(folderPath, fileName);
const buyAll = require("./buyAll"); // import buyAll for stratgy
const buyNone = require("./buyNone"); // import buyNone for strategy
require("dotenv").config();

import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: "insert api key here",
});

// Function to update the score of producers
async function updateProducerScores(game) {
  await game.players.forEach(async (player) => {
    if (player.get("role") !== "producer") return;
    const round = player.round.get("round"); // round specific, reset after each round
    const capital = player.get("capital"); // global
    const tempStock = player.get("stock");
    const currentStock = tempStock.find((item) => item.round === round);
    const remainingStock = currentStock.remainingStock;
    const wallet = player.get("wallet");
    const productPrice = currentStock.productPrice;
    const productCost = currentStock.productCost;
    const productQuality = currentStock.productQuality;
    const productAdQuality = currentStock.productAdQuality;
    const initialStock = currentStock.initialStock;
    const value = currentStock.value;
    const agents = game.get("agents");

    // human object
    const consumerAgent = agents.find((p) => {
      return p.role === "consumer" && p.agent === "artificial";
    });
    // automated object
    const others = agents.filter((p) => {
      return p.role !== "consumer" || p.agent !== "artificial";
    });

    // const strategy = getconsumerAgentFromId(consumerAgent.strategy);
    const roundNum = parseInt(round.replace("Round", ""), 10);
    if (consumerAgent.strategy == "gullible") {
      buyAll(
        consumerAgent,
        productPrice,
        remainingStock,
        initialStock,
        productCost,
        productQuality,
        productAdQuality,
        round,
        roundNum,
        player,
        capital,
        tempStock,
        game,
        others,
        value
      );
    } else if (consumerAgent.strategy == "titfortat") {
      if (roundNum == 1) {
        buyAll(
          consumerAgent,
          productPrice,
          remainingStock,
          initialStock,
          productCost,
          productQuality,
          productAdQuality,
          round,
          roundNum,
          player,
          capital,
          tempStock,
          game,
          others,
          value
        );
      } else if (
        roundNum > 1 &&
        consumerAgent.cheatedHistory[roundNum - 2] == false
      ) {
        buyAll(
          consumerAgent,
          productPrice,
          remainingStock,
          initialStock,
          productCost,
          productQuality,
          productAdQuality,
          round,
          roundNum,
          player,
          capital,
          tempStock,
          game,
          others,
          value
        );
      } else if (
        roundNum > 1 &&
        consumerAgent.cheatedHistory[roundNum - 2] == true
      ) {
        buyNone(
          consumerAgent,
          productPrice,
          remainingStock,
          initialStock,
          productCost,
          productQuality,
          productAdQuality,
          round,
          roundNum,
          player,
          capital,
          tempStock,
          game,
          others,
          value
        );
      }
    } else if (consumerAgent.strategy == "cynic") {
    /*
     * new strategy: cynic
     * check prior two rounds:
     * if either round was cheated, dont buy until the producer has a round where they dont cheat
     * if producer didnt cheat, buy as many as possible
     */
      // if we aren't at a case where we can check the prior two rounds, just buy as much as possible
      // (trivial case)
      if (roundNum < 3) {
        // buy all stock
        buyAll(
          consumerAgent,
          productPrice,
          remainingStock,
          initialStock,
          productCost,
          productQuality,
          productAdQuality,
          round,
          roundNum,
          player,
          capital,
          tempStock,
          game,
          others,
          value
        );
      } else {
        // if we are at a case where we can check the prior two rounds, check if either of the prior two rounds were cheated
        if (
          consumerAgent.cheatedHistory[roundNum - 2] == true ||
          consumerAgent.cheatedHistory[roundNum - 3] == true
        ) {
          // if either of the prior two rounds were cheated, don't buy
          buyNone(
            consumerAgent,
            productPrice,
            remainingStock,
            initialStock,
            productCost,
            productQuality,
            productAdQuality,
            round,
            roundNum,
            player,
            capital,
            tempStock,
            game,
            others,
            value
          );
        } else {
          // if neither of the prior two rounds were cheated, buy as much as possible
          buyAll(
            consumerAgent,
            productPrice,
            remainingStock,
            initialStock,
            productCost,
            productQuality,
            productAdQuality,
            round,
            roundNum,
            player,
            capital,
            tempStock,
            game,
            others,
            value
          );
        }
      }
    } else if (consumerAgent.strategy == "LLM") {
      let wallet = consumerAgent.wallet;
      const prompt =
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
        ". Answer with just a number, such as '5'.";

      const response = await getResponse(prompt);
      // validate response
      if (response < 0 || response > remainingStock) {
        console.log("remaining stock: " + remainingStock);
        throw new Error("Invalid quantity to buy: " + response);
      }

      // set soldStock to the response from ai
      const soldStock = parseInt(response);
      console.log("remaining stock: " + remainingStock);
      if (soldStock == 0) {
        const totalCost = initialStock * productCost;
        const totalSales = soldStock * productPrice;
        const originalScore = player.get("score") || 0;
        let score = player.get("score") || 0;
        score += totalSales - totalCost;
        consumerAgent.purchaseHistory.push({
          productQuality: productQuality,
          productAdQuality: productAdQuality,
          quantity: 0,
          round: round,
          roundNum: roundNum,
        });
        let consumerScore = consumerAgent.score;
        consumerAgent.scores.push({
          score: consumerScore,
          round: round,
          roundNum: roundNum,
        });
        others.forEach((producerAgent) => {
          producerAgent.scores.push({
            score: score,
            round: round,
            roundNum: roundNum,
          });
          producerAgent.productionHistory.push({
            productQuality: productQuality,
            productAdQuality: productAdQuality,
            initialStock: initialStock,
            remainingStock: remainingStock,
            soldStock: soldStock,
            round: round,
            roundNum: roundNum,
          });
        });
        let cheated =
          productAdQuality === productQuality
            ? false
            : productAdQuality === "low" && productQuality === "high"
            ? false
            : true;
        consumerAgent.cheatedHistory.push(cheated);
        player.set("score", score);
        player.set("scoreDiff", score - originalScore);
        player.set("capital", capital + totalSales);
      } else {
        const trialStock = tempStock.map((item) => {
          return item.round === round
            ? {
                ...item,
                remainingStock: item.remainingStock - soldStock,
                soldStock: item.soldStock + soldStock,
              }
            : item;
        });

        player.set("stock", trialStock);
        const totalCost = initialStock * productCost;
        const totalSales = soldStock * productPrice;
        const originalScore = player.get("score") || 0;
        let score = player.get("score") || 0;
        score += totalSales - totalCost;

        consumerAgent.purchaseHistory.push({
          productQuality: productQuality,
          productAdQuality: productAdQuality,
          quantity: soldStock,
          round: round,
          roundNum: roundNum,
        });
        let consumerScore = consumerAgent.score;
        consumerScore = (value - productPrice) * soldStock;
        consumerAgent.score = consumerScore;
        consumerAgent.scores.push({
          score: consumerScore,
          round: round,
          roundNum: roundNum,
        });
        let cheated =
          productAdQuality === productQuality
            ? false
            : productAdQuality === "low" && productQuality === "high"
            ? false
            : true;
        consumerAgent.cheatedHistory.push(cheated);
        others.forEach((producerAgent) => {
          producerAgent.scores.push({
            score: score,
            round: round,
            roundNum: roundNum,
          });
          producerAgent.productionHistory.push({
            productQuality: productQuality,
            productAdQuality: productAdQuality,
            initialStock: initialStock,
            remainingStock: remainingStock,
            soldStock: soldStock,
            round: round,
            roundNum: roundNum,
          });
        });
        wallet = wallet - parseInt(productPrice * soldStock);
        consumerAgent.wallet = wallet;
        player.set("score", score);
        player.set("scoreDiff", score - originalScore);
        player.set("capital", capital + totalSales);
      }
      others.push(consumerAgent);
      console.log(others);
      game.set("agents", others);
    }
  });
}

const getResponse = async (prompt) => {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: prompt }],
    model: "gpt-3.5-turbo",
  });

  console.log("message content: " + completion.choices[0].message.content);
  console.log("prompt: " + prompt);

  return completion.choices[0].message.content;
};

// Function to assign roles to players
function assignRoles(game) {
  const treatment = game.get("treatment");
  const producerPercentage = treatment.producerPercentage;
  const players = game.players;
  const numberOfProducers = Math.round(producerPercentage * players.length);

  const shuffledPlayers = [...players].sort(() => 0.5 - Math.random());
  shuffledPlayers.forEach((player, index) => {
    // const role = index < numberOfProducers ? "producer" : "consumer";
    const role = "producer";
    player.set("role", role);
  });
}

Empirica.onGameStart(async ({ game }) => {
  // TODO: Remove hardcoded values
  const numRounds = 5;
  for (let roundNumber = 1; roundNumber <= numRounds; roundNumber++) {
    const round = game.addRound({ name: `Round${roundNumber}` });
    round.addStage({ name: "selectRoleStage", duration: 24000 });
    round.addStage({ name: "stockStage", duration: 24000 });
    // round.addStage({ name: "choiceStage", duration: 24000 });
    round.addStage({ name: "feedbackStage", duration: 24000 });
    round.addStage({ name: "scoreboardStage", duration: 24000 });
  }

  game.players.forEach((player) => {
    player.set("score", 0);
  });
  assignRoles(game);
});

// Empirica.onStageStart(({ stage }) => {
//   switch(stage.get("name")) {

//   }
// })

Empirica.onStageEnded(({ stage }) => {
  switch (stage.get("name")) {
    // case "choiceStage":
    //   updateProducerScores(stage.currentGame);
    //   updateConsumerScores(stage.currentGame);
    //   break;
    case "stockStage":
      updateProducerScores(stage.currentGame);
      break;
  }
});

Empirica.onGameEnded(({ game }) => {});
