set :notes, []

live_loop :note do
  use_real_time
  note = sync "/osc:127.0.0.1:5000/twitchchat"
  
  notes = get[:notes]
  
  # Add new note to end of out array of notes
  set :notes, notes + [note]
  
  synth :prophet, note: note[0], cutoff: note[1], sustain: note[2]
end

live_loop :playback do
  use_real_time
  sync "/osc:127.0.0.1:5000/twitchmusic"
  
  notes = get[:notes]
  
  notes.each do |note|
    synth :prophet, note: note[0], cutoff: note[1], sustain: note[2]
    sleep 4
  end
end