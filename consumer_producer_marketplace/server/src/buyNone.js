function buyNone(
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
) {
  let wallet = consumerAgent.wallet;
  const soldStock = 0;
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

  others.push(consumerAgent);
  console.log(others);
  game.set("agents", others);
}

module.exports = buyNone;
