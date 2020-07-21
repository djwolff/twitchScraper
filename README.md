# twitchScraper
This project uses the Twitch API to collect and "follow" 100 streamers from the top 5 categories on twitch during an intentional 4 week time period.

### Motivation
The project exists to analytically view a streamer's influence within their own community and how their viewers support them. Donations, follows, subscriptions, and messages are all intentional interactions a viewer can perform that shows a streamer's influence, commitment, and participation.

### Twitch API
This project uses [Twitch API v5](https://dev.twitch.tv/docs/v5), [New Twitch API](https://dev.twitch.tv/docs/api), and [Twitch Webhooks](https://dev.twitch.tv/docs/api/webhooks-guide).

### Chatty
This project uses [Chatty](https://chatty.github.io/) to actively store events that occur during a twitch live stream.

### What kind of data is saved?
1. All games Twitch uses to categorize streams.
2. User data from Twitch.
3. Channel data from Twitch.
4. Livestream data from Twitch every ten minutes a livestream is up.
5. User follow data to a channel from Twitch.

### Notes --
1. July 21st at 3:31AM CST data collection paused and then resumed at 1:43PM.

### Future developments
#### difference of followers per stream or each week -- influence
#### change of (hopefully tiers) subs per stream or each week -- commitment
#### of people participating (chat count) -- participation
#### donations per stream or each week -- also commitment
#### peak viewership during the stream -- influence
#### type of stream or title (tags ??). 
#### Attain all followers for all channels we are following (will be able to update easily once initial list is obtained) -- each streamer probably averages 50 API calls so total 2500 calls.
#### Set up messages table (this is kinda hard tbh because the variety of messages that chatty provides)
#### Export tables into csv (for later use by Grace) -- can be done in python.


