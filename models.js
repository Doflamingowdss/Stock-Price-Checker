const mongodb = require('mongodb')
const mongoose = require('mongoose')
const crypto = require('crypto')
const {Schema} = mongoose

const anonymizeIP = (ip) => {
  return crypto.createHash('sha256').update(ip).digest('hex')
}

const Stock_Price_Checker_Schema = new Schema({
  symbol: { 
    type: String, 
    required: true,
    uppercase: true
  },
  likes: { 
    type: [String], 
    default: [] 
  } // Will store anonymized IPs
})

Stock_Price_Checker_Schema.methods.addLike = function(ip) {
  const anonymizedIP = anonymizeIP(ip)
  if (!this.likes.includes(anonymizedIP)) {
    this.likes.push(anonymizedIP)
  }
  return this.save()
}

const Stocks = mongoose.model("Stocks", Stock_Price_Checker_Schema)

module.exports = { Stocks, anonymizeIP }