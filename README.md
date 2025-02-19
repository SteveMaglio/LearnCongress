# Welcome to LearnCongress

This is a personal project I started working on in Early 2025. I wanted to get more comfortable with web development, but also create a platform to allow people to become more politically literate. The idea of this project stemmed from a conversation with my brother who recently started working for a congressperson, and he wanted an easy way to study the names and faces of the people he would be meeting every day. The first idea was to create a Tinder-style swipe gamemode where you are presented with a stack of Congress members, and you can swipe on categories like **Party they belong to**, **State they represent**, **# of terms served**, etc. Then, the idea became more fully formed to include other gamemodes like "Guess Who?", a statistics page, and even a way to track certain congresspeople in the news through our site. I quickly realized it could be equal parts `game` and `source of truth`. Through the Congressional API, we can easily access legislation that these members are voting for, like bills, amendments, congressional hearings, etc. By exposing this plainly on our site, I think it would be an easy way to access important information about our federal government and allow us to understand things for ourselves that the news might put a spin on.

I think recent events have demonstrated how valuable our vote can be, and how important it is to be educated on who we vote for and what our vote will stand for. The goal of this site is to reduce disinformation, increase transparency by providing access to federal information, and promote a more scrutinous mindset about our government.

# How the database stays up to date

Our backend is hosted in Supabase. this DB uses an edge function to retrieve latest info the Congressional API every night at midnight (thanks to cron scheduling thru Github Actions) and uses the `upsert` function to keep the data up-to-date without creating duplicates. Doing this rather than client-side api requests means that our site can be accessed by more people. the Congressional API has a rate limit of 5k requests/hour. Now, we are bottlenecked by whatever Supabase says, not Congress. Supabase has protection policies, but seems to be exactly what im looking for for this project. Shoutout to Professor Fontenot for insisting I use it in our Independent Study course way back. It turns out smart people know what they're talking about!

# To update the supabase edge function script

Supabase does not automatically read from github at the moment. you have to manually tell supabase the new function using this command.

supabase functions deploy **FUNCTION_FOLDER_NAME**
