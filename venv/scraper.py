#!/usr/bin/python
import requests
import json

with open("secret.json") as json_data_file:
    data = json.load(json_data_file)
    client_secret = data["client_secret"]
    clientID = data["clientID"]
    oauth = data["oauth"]

# difference of followers per stream or each week -- influence
# change of (hopefully tiers) subs per stream or each week -- commitment
# # of people particpating (chat count) -- partipation
# donations per stream or each week -- also commitment
# peak viewership during the stream -- influence
# type of stream or title (tags ??). 

def _url(path, type, args=[]):
    # type = helix -> oauth = bearer
    # type = kraken -> oauth = OAuth
    return f"https://api.twitch.tv/{type}/" + path + '&'.join(args) # oauth = bearer

def get_a_user():
    return requests.get(
            _url("users?", "helix") + "login=djwolff123",
            headers={
                'Content-Type': 'application/json',
                'Client-ID': clientID,
                'Authorization': 'Bearer ' + oauth})

def get_top_games():
    return requests.get(
            _url("games/top", "helix"),
            headers={
                'Content-Type': 'application/json',
                'Client-ID': clientID,
                'Authorization': 'Bearer ' + oauth})

def get_top_streams():
    return requests.get(
            _url("streams", "helix"),
            headers={
                'Content-Type': 'application/json',
                'Client-ID': clientID,
                'Authorization': 'Bearer ' + oauth})

def main():
    major_streams = get_top_streams()
    print(json.dumps(major_streams.json(), indent=4))

if __name__ == "__main__":
   # stuff only to run when not called via 'import' here
   main()
