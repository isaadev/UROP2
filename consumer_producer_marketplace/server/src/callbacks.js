import { ClassicListenersCollector } from "@empirica/core/admin/classic";
// import { getconsumerAgentFromId } from "../../client/src/strategie/ConsumerAgent.js"

export const Empirica = new ClassicListenersCollector();

const fs = require('fs');
const path = require('path');

const folderPath = '/';
const fileName = 'choices_consumer.json';
const filePath = path.join(folderPath, fileName);
const buyAll = require("./buyAll"); // import buyAll for stratgy
const buyNone = require("./buyNone"); // import buyNone for strategy





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
    const productQuality = currentStock.productQuality
    const productAdQuality = currentStock.productAdQuality
    const initialStock = currentStock.initialStock;
    const value = currentStock.value;
    const agents = game.get("agents");
    

    // human object
    const consumerAgent = agents.find(p => {
      return p.role === "consumer" && p.agent === "artificial"
    })
    // automated object
    const others = agents.filter(p => {
      return p.role !== "consumer" || p.agent !== "artificial"
    })

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
    }
    else if (consumerAgent.strategy == "titfortat") {
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
      }
      else if (roundNum > 1 && consumerAgent.cheatedHistory[roundNum-2] == false) {
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
      else if (roundNum > 1 && consumerAgent.cheatedHistory[roundNum-2] == true) {
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
        )
    }
  }
    /*
    * new strategy: cynic
    * check prior two rounds:
    * if either round was cheated, dont buy until the producer has a round where they dont cheat
    * if producer didnt cheat, buy as many as possible
    */
    else if (consumerAgent.strategy == "cynic"){
      // if we aren't at a case where we can check the prior two rounds, just buy as much as possible 
      // (trivial case)
      if (roundNum < 3){
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
        )
      }
      else {
        // if we are at a case where we can check the prior two rounds, check if either of the prior two rounds were cheated
        if (consumerAgent.cheatedHistory[roundNum-2] == true || consumerAgent.cheatedHistory[roundNum-3] == true){
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
          )
        }
        else {
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
          )
        };
      }
    }
})
}

// Function to assign roles to players
function assignRoles(game) {
  const treatment = game.get("treatment");
  const producerPercentage = treatment.producerPercentage;
  const players = game.players;
  const numberOfProducers = Math.round(producerPercentage * players.length);

  const shuffledPlayers = [...players].sort(() => 0.5 - Math.random());
  shuffledPlayers.forEach((player, index) => {
    // const role = index < numberOfProducers ? "producer" : "consumer";
    const role = "producer"
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

Empirica.onGameEnded(({ game }) => { });
