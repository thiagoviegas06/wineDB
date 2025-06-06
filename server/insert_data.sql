-- Insert sample users
INSERT INTO users (username, email, password_hash, user_role)
VALUES
('Test', 'test@gmail.com', 'test1234', 'user'),
('JoeSmith', 'joesmith@gmail.com', 'hashed_joesmith', 'user'),
('JaneDoe', 'janedoe@gmail.com', 'hashed_janedoe', 'user'),
('AliceW', 'alice@gmail.com', 'hashed_alice', 'user'),
('BobVine', 'bob@vineyard.com', 'hashed_bob', 'user'),
('WineLover', 'winelover@tasting.com', 'hashed_winelover', 'user'),
('RedFan', 'redfan@vino.com', 'hashed_red', 'user'),
('WhiteFan', 'whitefan@vino.com', 'hashed_white', 'user'),
('SommelierSam', 'sam@tasting.com', 'hashed_sam', 'user'),
('TasterTina', 'tina@wine.com', 'hashed_tina', 'user'),
('AdminUser', 'admin@gmail.com', 'hashed_admin', 'admin');


-- Insert sample profiles
INSERT INTO profile (user_id, bio, profile_pic, backg_pic)
VALUES
(1, 'Loves red wines and coding.', 'pic1.jpg', 'bg1.jpg'),
(2, 'Just a guy who likes Merlot.', 'pic2.jpg', 'bg2.jpg'),
(3, 'Exploring the world of white wines.', 'pic3.jpg', 'bg3.jpg'),
(4, 'Wine and adventure!', 'pic4.jpg', 'bg4.jpg'),
(5, 'Owner of Bobs Vineyard.', 'pic5.jpg', 'bg5.jpg'),
(6, 'Certified sommelier.', 'pic6.jpg', 'bg6.jpg'),
(7, 'Pinot Noir aficionado.', 'pic7.jpg', 'bg7.jpg'),
(8, 'Chardonnay enthusiast.', 'pic8.jpg', 'bg8.jpg'),
(9, 'I rate wines in my sleep.', 'pic9.jpg', 'bg9.jpg'),
(10, 'New to tasting but excited!', 'pic10.jpg', 'bg10.jpg');

-- Insert verifications
INSERT INTO verifications (user_id, verification_hash)
VALUES
(1, 'verif_hash_1'),
(2, 'verif_hash_2'),
(3, 'verif_hash_3'),
(4, 'verif_hash_4'),
(5, 'verif_hash_5'),
(6, 'verif_hash_6'),
(7, 'verif_hash_7'),
(8, 'verif_hash_8'),
(9, 'verif_hash_9'),
(10, 'verif_hash_10'),
(11, 'verif_hash_11');


-- Insert vineyards
-- COPY vineyard(vineyard_id, name, owner, appelation, country, region)
-- FROM 'D:\wineDB\data\vineyard.csv'
-- DELIMITER ',' CSV HEADER;
-- Insert vineyards (IDs will be 1 to 5)
INSERT INTO vineyard (name, owner, appelation, country, region) VALUES
( 'Black Ridge Estate', 'Margaret Lang', 'Napa Valley', 'USA', 'California'),         -- id = 1
( 'Domaine de Lumiere', 'Etienne Moreau', 'Loire Valley', 'France', 'Loire'),         -- id = 2
( 'Villa Rosso', 'Giovanni Bianchi', 'Tuscany', 'Italy', 'Tuscany'),                  -- id = 3
( 'Sunset Hills Vineyard', 'Amelia Carter', 'Barossa Valley', 'Australia', 'South Australia'), -- id = 4
( 'Andes Crest', 'Luis Mendoza', 'Mendoza', 'Argentina', 'Cuyo');                     -- id = 5

-- Fix wine insertions to reference correct vineyard_id
INSERT INTO wine (vineyard_id, name, classification, grape, year, price, rating) VALUES
(1, 'Black Ridge Cabernet', 'Red', 'Cabernet Sauvignon', 2018, 45, 4.5),
(2, 'Lumiere Chardonnay', 'White', 'Chardonnay', 2020, 35, 4.2),
(2, 'Sunset Rosé', 'Rosé', 'Grenache', 2021, 25, 3.8),            -- assumed under Domaine de Lumiere
(3, 'Villa Merlot Reserve', 'Red', 'Merlot', 2015, 60, 4.8),
(2, 'Loire Sauvignon Blanc', 'White', 'Sauvignon Blanc', 2019, 28, 4.0),
(2, 'Golden Riesling', 'Dessert', 'Riesling', 2017, 50, 4.7),     -- adjusted vineyard
(3, 'Pinot Ember', 'Red', 'Pinot Noir', 2022, 40, 4.1),
(4, 'Barossa Zinfandel', 'Red', 'Zinfandel', 2020, 38, 4.4),
(5, 'Mendoza Whisper', 'White', 'Gewurztraminer', 2021, 30, 3.7),
(2, 'Moscato Delight', 'Dessert', 'Moscato', 2016, 27, 4.3),
(5, 'Andes Syrah', 'Red', 'Syrah', 2018, 55, 4.6),
(5, 'Sparkle Chenin', 'Sparkling', 'Chenin Blanc', 2022, 33, 4.0),
(5, 'Harvest Albariño', 'White', 'Albarino', 2019, 29, 3.9),
(5, 'Tempranillo Blush', 'Rosé', 'Tempranillo', 2020, 26, 3.6),
(5, 'Malbec Bloom', 'Red', 'Malbec', 2017, 42, 4.5);


-- Insert food pairings
-- Insert food pairings
-- Insert food pairings (corrected wine_id range: 1–15)
INSERT INTO food_pairing (wine_id, name)
VALUES
(1, 'Duck confit'),
(2, 'Tapas and cured meats'),
(3, 'Eggplant Parmigiana'),
(4, 'Roasted turkey breast'),
(5, 'Beef brisket sliders'),
(6, 'Sicilian meatballs'),
(7, 'Argentinian grilled steak'),
(8, 'Lamb empanadas'),
(9, 'Chorizo and Manchego crostini'),
(10, 'Herbed goat cheese crostini'),
(11, 'Grilled calamari'),
(12, 'BBQ pork ribs'),
(13, 'Seafood risotto'),
(14, 'Lemon chicken with herbs'),
(15, 'Caprese salad with fresh basil'),
(1, 'Mushroom risotto'),
(2, 'Roasted duck with cherry glaze'),
(3, 'Spicy Pad Thai'),
(4, 'Beef bourguignon'),
(5, 'Braised short ribs'),
(6, 'Pan-seared scallops'),
(7, 'Prime rib with horseradish cream'),
(8, 'Pasta Bolognese'),
(9, 'Grilled lamb chops'),
(10, 'Smoked salmon tartare'),
(11, 'Lamb shawarma wrap'),
(12, 'Portobello mushroom burger'),
(13, 'Tuna tartare with avocado'),
(14, 'BBQ brisket with cornbread');



-- Insert ratings
INSERT INTO rating (wine_id, user_id, value, description)
VALUES
(1, 1, 4, 'Crisp and mineral-driven with a clean finish.'),
(2, 2, 4, 'Delightfully sweet and perfect for dessert.'),
(3, 3, 3, 'Fruity and earthy with balanced acidity.'),
(4, 4, 3, 'Interesting blend, but a bit too tannic.'),
(5, 5, 4, 'Aromatic and smooth—loved it with dinner.'),
(6, 6, 4, 'Elegant and clean, with floral notes.'),
(7, 7, 5, 'Rich and bold, perfect with red meat.'),
(8, 8, 3, 'Nice body but slightly too dry for my taste.'),
(9, 9, 5, 'Incredible Malbec—full of spice and depth.'),
(10, 10, 4, 'Juicy and layered, very enjoyable.');

INSERT INTO cellar (user_id, wine_id)
VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5),
(6, 6),
(7, 7),
(8, 8),
(9, 9),
(10, 10);




WITH profile_images AS (
  SELECT user_id,
         bio,
         ARRAY['grapes.jpg', 'grapes2.jpg', 'vineyard.jpg', 'wine1.jpg', 'wine2.jpg', 'wine3.jpg'] AS profile_pics,
         ARRAY['bg1.jpg', 'bg2.jpg', 'bg3.jpg'] AS background_pics
  FROM profile
)
UPDATE profile
SET profile_pic = profile_images.profile_pics[(profile.user_id % 6) + 1],
    backg_pic = profile_images.background_pics[(profile.user_id % 3) + 1]
FROM profile_images
WHERE profile.user_id = profile_images.user_id;
