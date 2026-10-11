# HuGo Intelligence

This directory contains the first safe, reproducible data/ML foundation for HuGo Travel.

- `kaggle/00_quickstart_restaurant_reviews.py`: English restaurant-review prototype for the dataset currently attached in Kaggle.
- `kaggle/01_travelgo_data_quality.py`: validates a private, anonymized TravelGo export before model training.
- `data/exports/`: generated locally by `npm run ai:export`; ignored by Git and must remain private.

The production system must train only on first-party or explicitly licensed content. Google Maps Content is runtime display/routing data and is excluded from training exports.
