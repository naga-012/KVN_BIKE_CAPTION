import React, { useState } from 'react';
import { X, Star, HeartHandshake } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const RatingModal = ({ isOpen, onClose, ride, onRatingSubmitted }) => {
  const { addToast } = useToast();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['Smooth Ride', 'Polite Driver']);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !ride) return null;

  const availableTags = [
    'Smooth Ride',
    'Polite Driver',
    'Clean Vehicle',
    'Safe Driving',
    'Great Route',
    'On Time',
  ];

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/rides/${ride._id}/rate`, {
        score,
        comment,
        tags: selectedTags,
      });
      addToast('Thank you for rating your ride partner!', 'success');
      onRatingSubmitted();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Rate Your Experience</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stars */}
        <div className="my-6 text-center">
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setScore(star)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`w-9 h-9 ${
                    star <= score
                      ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                      : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="text-xs font-semibold text-amber-400">
            {score === 5 && 'Outstanding Experience!'}
            {score === 4 && 'Very Good Ride!'}
            {score === 3 && 'Average Ride'}
            {score === 2 && 'Below Expectations'}
            {score === 1 && 'Poor Experience'}
          </div>
        </div>

        {/* Feedback chips */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-300 mb-2">What did you like?</div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Written Review */}
        <div className="mb-6">
          <textarea
            rows="3"
            placeholder="Tell us more about your trip (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-glow disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'SUBMIT RATING'}
        </button>
      </div>
    </div>
  );
};
