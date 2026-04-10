/**
 * Seed the TRBC (The Refinitiv Business Classification) taxonomy.
 * Source: https://en.wikipedia.org/wiki/The_Refinitiv_Business_Classification
 *
 * Our three-level model maps to TRBC as:
 *   - Sector   ← TRBC Business Sector
 *   - Industry ← TRBC Industry
 *   - Activity ← TRBC Activity
 *
 * Run with:
 *   npx ts-node prisma/seed-trbc.ts
 *
 * Idempotent — re-running upserts by (parent, name).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type TrbcTree = ReadonlyArray<{
  sector: string;
  industries: ReadonlyArray<{
    name: string;
    activities: ReadonlyArray<string>;
  }>;
}>;

const TRBC: TrbcTree = [
  {
    sector: "Energy - Fossil Fuels",
    industries: [
      { name: "Coal", activities: ["Coal (NEC)", "Coal Mining Support", "Coal Wholesale"] },
      { name: "Integrated Oil & Gas", activities: ["Integrated Oil & Gas"] },
      { name: "Oil & Gas Exploration and Production", activities: ["Oil & Gas Exploration and Production (NEC)", "Oil Exploration & Production - Onshore", "Oil Exploration & Production - Offshore", "Natural Gas Exploration & Production - Onshore", "Natural Gas Exploration & Production - Offshore", "Unconventional Oil & Gas Production"] },
      { name: "Oil & Gas Refining and Marketing", activities: ["Oil & Gas Refining and Marketing (NEC)", "Petroleum Refining", "Gasoline Stations", "Petroleum Product Wholesale"] },
      { name: "Oil & Gas Drilling", activities: ["Oil & Gas Drilling (NEC)", "Oil Drilling - Onshore", "Gas Drilling - Onshore", "Oil Drilling - Offshore", "Gas Drilling - Offshore", "Unconventional Oil & Gas Drilling"] },
      { name: "Oil Related Services and Equipment", activities: ["Oil Related Services and Equipment (NEC)", "Oil Related Services", "Oil Related Equipment", "Oil Related - Surveying & Mapping Services"] },
      { name: "Oil & Gas Transportation Services", activities: ["Oil & Gas Transportation Services (NEC)", "LNG Transportation & Storage", "Natural Gas Pipeline Transportation", "Oil Pipeline Transportation", "Sea-Borne Tankers", "Oil & Gas Storage"] },
    ]
  },
  {
    sector: "Renewable Energy",
    industries: [
      { name: "Renewable Energy Equipment & Services", activities: ["Renewable Energy Equipment & Services (NEC)", "Wind Systems & Equipment", "Stationary Fuel Cells", "Photovoltaic Solar Systems & Equipment", "Thermal Solar Systems & Equipment", "Biomass Power Energy Equipment", "Waste to Energy Systems & Equipment", "Hydropower Equipment", "Wave Power Energy Equipment", "Renewable Energy Services", "Geothermal Equipment"] },
      { name: "Renewable Fuels", activities: ["Renewable Fuels (NEC)", "Biodiesel", "Ethanol Fuels", "Pyrolytic & Synthetic Fuels", "Biomass & Biogas Fuels", "Hydrogen Fuel"] },
    ]
  },
  {
    sector: "Uranium",
    industries: [
      { name: "Uranium", activities: ["Uranium (NEC)", "Uranium Mining", "Uranium Processing"] },
    ]
  },
  {
    sector: "Chemicals",
    industries: [
      { name: "Commodity Chemicals", activities: ["Commodity Chemicals (NEC)", "Plastics", "Paints & Coatings", "Tanning & Softening Agents", "Explosives", "Industrial Gases", "Commodity Chemicals Wholesale", "Glass"] },
      { name: "Agricultural Chemicals", activities: ["Agricultural Chemicals (NEC)", "Fertilizers", "Pesticides", "Organic Fertilizers", "Agricultural Chemicals Wholesale"] },
      { name: "Specialty Chemicals", activities: ["Specialty Chemicals (NEC)", "Coloring Agents", "Synthetic Fibers", "Advanced Polymers", "Industrial Biotechnology Chemicals", "Specialty Chemicals Wholesale", "Composites", "Adhesive & Epoxy"] },
      { name: "Diversified Chemicals", activities: ["Diversified Chemicals"] },
    ]
  },
  {
    sector: "Mineral Resources",
    industries: [
      { name: "Non-Gold Precious Metals & Minerals", activities: ["Non-Gold Precious Metals & Minerals (NEC)", "Silver Mining", "Platinum Mining", "Diamond Mining", "Semiprecious Gem Stones", "Pearl Cultivation", "Rare Earth Minerals"] },
      { name: "Iron & Steel", activities: ["Iron & Steel (NEC)", "Iron Ore Mining", "Coke Coal Mining", "Iron, Steel Mills & Foundries", "Metal Service Centers", "Metallic Rolling & Drawing Products", "Metal Merchant Wholesale"] },
      { name: "Aluminum", activities: ["Aluminum (NEC)", "Primary Aluminum Production", "Secondary Smelting & Alloying of Aluminum", "Aluminum Rolling", "Aluminum Refining", "Aluminum Wholesale", "Bauxite Mining"] },
      { name: "Specialty Mining & Metals", activities: ["Specialty Mining & Metals (NEC)", "Lead Ore Mining", "Copper Ore Mining", "Nickel Ore Mining", "Zinc Ore Mining", "Nonferrous Metal Mining", "Nonferrous Metal Processing", "Specialty Mining & Metals Wholesale"] },
      { name: "Gold", activities: ["Gold (NEC)", "Gold Mining", "Gold Refining"] },
      { name: "Mining Support Services & Equipment", activities: ["Mining Support Services & Equipment (NEC)", "Geophysical Surveying & Mapping Services", "Mining Support Services", "Mining Machinery & Equipment Manufacturing"] },
      { name: "Diversified Mining", activities: ["Diversified Mining"] },
      { name: "Construction Materials", activities: ["Construction Materials (NEC)", "Construction Material Processing", "Cement & Concrete Manufacturing", "Tile & Paving Material Manufacturing", "Rock Mining", "Construction Material Wholesale"] },
    ]
  },
  {
    sector: "Applied Resources",
    industries: [
      { name: "Forest & Wood Products", activities: ["Forest & Wood Products (NEC)", "Timber Tract Operations", "Forest Nurseries & Gathering of Forest Products", "Logging & Sawmills", "Forest Support & Services", "Wood Products", "Wood Product Wholesale"] },
      { name: "Paper Products", activities: ["Paper Products (NEC)", "Paper Mills & Products", "Newsprint Mills", "Pulp Mills", "Paper Product Wholesale"] },
      { name: "Non-Paper Containers & Packaging", activities: ["Non-Paper Containers & Packaging (NEC)", "Textile Containers & Packaging", "Glass Containers & Packaging", "Metal Containers & Packaging", "Plastic Containers & Packaging", "Wood Container & Packaging", "Container & Packaging Material Wholesale"] },
      { name: "Paper Packaging", activities: ["Paper Packaging (NEC)", "Paper Packaging Wholesale"] },
    ]
  },
  {
    sector: "Industrial Goods",
    industries: [
      { name: "Aerospace & Defense", activities: ["Aerospace & Defense (NEC)", "Arms & Ammunitions Manufacturing", "Commercial Aircraft Manufacturing", "Military Aircraft Manufacturing", "Aircraft Parts Manufacturing", "Military Vehicles Manufacturing", "Satellite Design & Manufacture", "Spacecraft Manufacturing", "Military Clothing & Accessories", "Aircraft Equipment Wholesale", "Aerospace & Defense Electronics", "Drone Manufacturing"] },
      { name: "Industrial Machinery & Equipment", activities: ["Industrial Machinery & Equipment (NEC)", "Industrial Components", "Industrial Machinery", "Ball & Roller Bearings", "Testing & Measuring Equipment", "Pump & Pumping Equipment", "Air & Gas Compressors", "Welding & Soldering Equipment", "Industrial Process Furnace & Ovens", "Fluid Power Cylinder & Actuators", "Automatic Vending Machines", "Industrial Moulds", "Machine Tools", "Industrial Valve Manufacturing", "Industrial Machinery & Equipment Wholesale", "Commercial Equipment"] },
      { name: "Heavy Machinery & Vehicles", activities: ["Heavy Machinery & Vehicles (NEC)", "Construction Machinery", "Heavy Trucks", "Heavy Buses & Coaches", "Locomotive Engines & Rolling Stock", "Agricultural Machinery", "Commercial Landscaping Equipment", "Heavy Machinery & Vehicles Wholesale"] },
      { name: "Electrical Components & Equipment", activities: ["Electrical Components & Equipment (NEC)", "Batteries & Uninterruptible Power Supplies", "Wires & Cables", "Electrical Components", "Lighting Equipment", "Heating, Ventilation & Air Conditioning Systems", "Electrical Insulators", "Switchgear", "Portable Motors & Generators", "Electrical Measuring & Testing Instruments", "Electric Equipment Wholesale"] },
      { name: "Heavy Electrical Equipment", activities: ["Heavy Electrical Equipment (NEC)", "Electrical Transmission & Grid Equipment", "Elevator & Conveying Equipment", "Turbine Manufacturing", "Heavy Motors & Generators", "Industrial Electrical Switchgear", "Nuclear Generators & Components"] },
      { name: "Shipbuilding", activities: ["Shipbuilding (NEC)", "Ship Parts Manufacturers", "Ship Repairing & Maintenance"] },
    ]
  },
  {
    sector: "Industrial & Commercial Services",
    industries: [
      { name: "Construction & Engineering", activities: ["Construction & Engineering (NEC)", "Commercial Buildings", "Highway & Bridge Construction", "Railway Construction", "Power & Communications Network Construction", "Civil Engineers & Architects", "Building Contractors", "Industrial Plant Construction", "Water & Sewage Construction", "Land Division & Subdivision", "Gas Infrastructure Construction", "Electric Power Plant Construction", "Nuclear Power Plant Construction", "Telecommunication Construction"] },
      { name: "Diversified Industrial Goods Wholesale", activities: ["Diversified Industrial Goods Wholesale"] },
      { name: "Environmental Services & Equipment", activities: ["Environmental Services & Equipment (NEC)", "Purification & Treatment Equipment", "Waste Management, Disposal & Recycling Services", "Environmental Consultancy Services", "Environmental R&D Services & Biotechnology", "Carbon Capture & Storage"] },
      { name: "Commercial Printing Services", activities: ["Commercial Printing Services (NEC)", "Specialized Printing Services", "Newspaper & Magazine Printing Services", "Book Printing Services"] },
      { name: "Employment Services", activities: ["Employment Services (NEC)", "Human Resources Consulting Services", "Outsourcing & Staffing Services", "Executive Search Services", "Online Job Portals"] },
      { name: "Business Support Services", activities: ["Business Support Services (NEC)", "Corporate Accounting Services", "Legal Services", "Management Consulting Services", "Security Services", "Cleaning Services", "Data Processing Services", "Industrial Equipment Rental", "Office Equipment & Supplies Rental", "Pest Control Services", "Maintenance & Repair Services", "Industrial Design Services", "Translation & Interpretation Services", "Testing Laboratories", "Call Center Services", "Exhibition & Conference Services", "Transaction & Payment Services"] },
      { name: "Business Support Supplies", activities: ["Business Support Supplies (NEC)", "Office Furniture", "Office Supplies", "Health, Safety & Fire Protection Equipment", "Office Supplies Wholesale"] },
      { name: "Professional Information Services", activities: ["Professional Information Services (NEC)", "Financial Information Providers", "Compliance & Investor Communication", "Rating Agencies", "Trade & Business Publishing", "Legal & Tax Information Providers", "Education & Training Information Providers", "Journals & Scholarly Research", "News Agencies", "Libraries & Archives"] },
    ]
  },
  {
    sector: "Transportation",
    industries: [
      { name: "Courier, Postal, Air Freight & Land-based Logistics", activities: ["Courier, Postal, Air Freight & Land-based Logistics (NEC)", "Freight Logistics", "Air Freight", "Courier Services", "Integrated Logistics Operators"] },
      { name: "Marine Freight & Logistics", activities: ["Marine Freight & Logistics (NEC)", "Marine Logistics", "Inland Water Freight", "Deep Sea Freight"] },
      { name: "Ground Freight & Logistics", activities: ["Ground Freight & Logistics (NEC)", "Railway Freight Operators", "Freight Trucking", "Warehousing", "Truck Rental"] },
      { name: "Airlines", activities: ["Airlines (NEC)", "Regional Airlines", "Charter & Private Air Services", "Specialized Aviation Services", "Inter-Modal Passenger Transportation"] },
      { name: "Passenger Transportation, Ground & Sea", activities: ["Passenger Transportation, Ground & Sea (NEC)", "Commuting Services", "Charter Bus Services", "Rail Services", "Marine Passenger Transportation", "Commuter Ferry Operators", "Taxis & Limousines", "Passenger Car Rental"] },
      { name: "Airport Operators & Services", activities: ["Airport Operators & Services (NEC)", "Airport Operators", "Duty Free Shops", "Airport Fueling Services", "Airline Catering Services"] },
      { name: "Marine Port Services", activities: ["Marine Port Services (NEC)", "Port Warehousing Services", "Port Operators", "Marine Cargo Handling Services"] },
      { name: "Highways & Rail Tracks", activities: ["Highways & Rail Tracks (NEC)", "Highway Operators", "Railway Operators", "Parking Lot Operators"] },
    ]
  },
  {
    sector: "Automobiles & Auto Parts",
    industries: [
      { name: "Auto & Truck Manufacturers", activities: ["Auto & Truck Manufacturers (NEC)", "Motorcycles & Scooters", "Automobiles & Multi Utility Vehicles", "Light Trucks", "Electric (Alternative) Vehicles", "Luxury Vehicles", "Auto & Truck Wholesale"] },
      { name: "Auto, Truck & Motorcycle Parts", activities: ["Auto, Truck & Motorcycle Parts (NEC)", "Automotive Body Parts", "Engine & Powertrain Systems", "Automotive Batteries", "Automotive Systems", "Automotive Accessories", "Motorcycle Parts & Accessories", "Auto & Truck Parts Wholesale"] },
      { name: "Tires & Rubber Products", activities: ["Tires & Rubber Products (NEC)", "Tire & Tube Manufacturers", "Tire Retreading", "Industrial Rubber Products", "Rubber Plantations", "Tires & Rubber Products Wholesale"] },
    ]
  },
  {
    sector: "Cyclical Consumer Products",
    industries: [
      { name: "Textiles & Leather Goods", activities: ["Textiles & Leather Goods (NEC)", "Synthetic Fabrics", "Natural Fabrics", "Organic & Ecologically Produced Fabric", "Leather Goods", "Fur Goods", "Fabric Dyeing & Finishing", "Yarn Goods", "Cotton Farming", "Textiles & Leather Goods Wholesale"] },
      { name: "Apparel & Accessories", activities: ["Apparel & Accessories (NEC)", "Men's Clothing", "Women's Clothing", "Children's & Infants' Clothing", "Sportswear & Outdoors Clothing", "Jeans", "Knitwear", "Lingerie", "Hosiery & Socks", "Industrial Clothing & Uniforms", "Fair Trade & Ethical Clothing", "Luxury Clothing", "Theatrical Costumes", "Animal & Pet Clothing", "Luxury Accessories", "Accessories", "Jewelry", "Watches", "Handbags & Luggage", "Fashion Eyewear", "Apparel Wholesale"] },
      { name: "Footwear", activities: ["Footwear (NEC)", "Men's Footwear", "Women's Footwear", "Children's & Infants' Footwear", "Sports & Outdoor Footwear", "Luxury Footwear", "Functional Footwear", "Footwear Wholesale"] },
      { name: "Homebuilding", activities: ["Homebuilding (NEC)", "Residential Builders - Single Homes", "Residential Builders - Multifamily Homes", "Prefabricated Homes", "Sustainable & Energy Efficient Home Builders", "Retirement Home Builders", "Residential Architectural & Interior Design Services"] },
      { name: "Construction Supplies & Fixtures", activities: ["Construction Supplies & Fixtures (NEC)", "Construction Supplies", "Luxury Construction Supplies & Fixtures", "Doors & Window Frames", "Flooring & Interior Tile Manufacturers", "Plumbing Fixtures & Fittings", "Kitchen Cabinets", "Bathroom Fixtures", "Roofing Supplies", "Lighting Fixtures", "Construction Supplies & Fixtures Wholesale"] },
      { name: "Appliances, Tools & Housewares", activities: ["Appliances, Tools & Housewares (NEC)", "Household Appliances", "Tools & Housewares", "Kitchen Appliances", "Cutlery & Flatware", "Appliance & Houseware Wholesale", "Luxury Appliances"] },
      { name: "Home Furnishings", activities: ["Home Furnishings (NEC)", "Carpets & Curtains", "Wallpaper", "Luxury Furnishing", "Antiques", "Home Furnishings Wholesale", "Furniture", "Art & Craftwork"] },
      { name: "Toys & Children's Products", activities: ["Toys & Children's Products (NEC)", "Dolls & Stuffed Toys", "Games, Toys & Children's Vehicles", "Children's Safety Products", "Children's Furniture", "Children's Products & Accessories", "Toys & Children's Products Wholesale"] },
      { name: "Recreational Products", activities: ["Recreational Products (NEC)", "Sailing Yachts & Motorboats", "Bicycle Manufacturing", "Sporting & Outdoor Goods", "Musical Instruments", "Luxury Recreational Products", "Leisure Products Wholesale", "Electric Scooters & Bicycles"] },
    ]
  },
  {
    sector: "Cyclical Consumer Services",
    industries: [
      { name: "Hotels, Motels & Cruise Lines", activities: ["Hotels, Motels & Cruise Lines (NEC)", "Hotels & Motels", "Cruise Lines", "Luxury Hotels", "Resort Operators", "Bed & Breakfast", "Self-Catering Accommodation", "Campsite Operators"] },
      { name: "Restaurants & Bars", activities: ["Restaurants & Bars (NEC)", "Pubs, Bars & Night Clubs", "Commercial Food Services", "Quick Service Restaurants", "Mobile Caterers", "Banquet Halls & Catering", "Caf\u00e9s"] },
      { name: "Casinos & Gaming", activities: ["Casinos & Gaming (NEC)", "Gambling & Gaming Machine Manufacturers", "Gaming Machine Operators", "Casinos", "Horse & Dog Race Tracks", "Lottery Operators"] },
      { name: "Leisure & Recreation", activities: ["Leisure & Recreation (NEC)", "Movie Theaters & Movie Products", "Theatres & Performing Arts", "Museums & Historic Places", "Travel Agents", "Amusement Parks and Zoos", "Gyms, Fitness and Spa Centers", "Adventure Sports Facilities & Ski Resorts", "Public Sport Facilities", "Professional Sports Venues", "Golf Courses", "Hunting & Fishing", "Marinas", "Guided Tour Operators"] },
      { name: "Advertising & Marketing", activities: ["Advertising & Marketing (NEC)", "Advertising Agency", "Media Buying Agency", "Signs & Advertising Specialty Producers", "Outdoor Advertising", "Direct Marketing", "Sales Promotions & Events Management", "Guerrilla & Sensory Marketing", "Public Relations", "Digital Media Agencies", "Branding & Naming", "Market Research", "Marketing Consulting Services"] },
      { name: "Broadcasting", activities: ["Broadcasting (NEC)", "Television Broadcasting", "Radio Broadcasting", "Cable Service Providers"] },
      { name: "Entertainment Production", activities: ["Entertainment Production (NEC)", "Movie, TV Production & Distribution", "Music, Music Video Production & Distribution", "Plays & Concert Production", "Entertainment Production Equipment & Services", "Copyright Management", "Adult Entertainment Production & Broadcasting"] },
      { name: "Consumer Publishing", activities: ["Consumer Publishing (NEC)", "Newspaper Publishing", "Magazine Publishing", "Book Publishing", "Directory Publishing", "Digital Publishing", "Adult Publishing", "Books, Newspapers & Magazines Wholesale"] },
    ]
  },
  {
    sector: "Retailers",
    industries: [
      { name: "Department Stores", activities: ["Department Stores (NEC)", "General Department Stores", "Luxury Department Stores", "Internet & Mail Order Department Stores"] },
      { name: "Discount Stores", activities: ["Discount Stores (NEC)", "Internet & Mail Order Discount Stores", "Discount Stores with Grocery", "Discount Stores without Grocery", "Discount Stores with Gasoline", "Discount Stores without Gasoline"] },
      { name: "Auto Vehicles, Parts & Service Retailers", activities: ["Auto Vehicles, Parts & Service Retailers (NEC)", "New Car Dealers", "Used Car Dealers", "Motorcycle Dealers", "Automotive Parts & Accessories Retailers", "Tire Dealers", "Luxury Car Dealers"] },
      { name: "Home Improvement Products & Services Retailers", activities: ["Home Improvement Products & Services Retailers (NEC)", "Paint & Wallpaper Retailers", "Builder Merchants", "Nursery & Garden Centers", "Kitchen & Bathroom Retailers", "Home D\u00e9cor Retailers", "Interior Design Services", "Luxury Home Improvement Product Retailers"] },
      { name: "Home Furnishings Retailers", activities: ["Home Furnishings Retailers (NEC)", "Furniture Retailers", "Floor Covering Retailers", "Soft Furnishing Retailers", "Luxury Furnishing Retailers", "Antique Dealers", "Art & Craftwork Retailers"] },
      { name: "Apparel & Accessories Retailers", activities: ["Apparel & Accessories Retailers (NEC)", "Footwear Retailers", "Jewelry & Watch Retailers", "Men's Apparel Retailers", "Women's Apparel Retailers", "Children's & Infants' Clothing Retailers", "Teen Fashion Retailers", "Handbags & Luggage Retailers", "Luxury Apparel Retailers", "Sports & Outdoors Retailers"] },
      { name: "Computer & Electronics Retailers", activities: ["Computer & Electronics Retailers (NEC)", "Computer Hardware & Software Retailers", "Consumer Electronics Retailers", "Mobile Phone Retailers"] },
      { name: "Miscellaneous Specialty Retailers", activities: ["Miscellaneous Specialty Retailers (NEC)", "Luxury Beauty Supply Retailers", "Personal Care Products Retailers", "Optical Goods Stores", "Health Food Stores", "Musical Instrument Retailers", "Hobby & Craft Product Retailers", "Toys & Games Retailers", "Book & Magazine Retailers", "Florists", "Office Supplies & Stationery Stores", "Gift, Novelty & Souvenir Stores", "Used Merchandise Stores", "Sporting Goods Stores", "Pet & Pet Supplies Retailers", "Adult Products Retailers"] },
    ]
  },
  {
    sector: "Food & Beverages",
    industries: [
      { name: "Brewers", activities: ["Brewers (NEC)", "Craft & Micro Brewers"] },
      { name: "Distillers & Wineries", activities: ["Distillers & Wineries (NEC)", "Wineries", "Distilleries", "Malt Producers"] },
      { name: "Non-Alcoholic Beverages", activities: ["Non-Alcoholic Beverages (NEC)", "Carbonated Soft Drinks", "Fruit Drinks", "Energy Drinks", "Bottled Water & Ice"] },
      { name: "Fishing & Farming", activities: ["Fishing & Farming (NEC)", "Grain (Crop) Production", "Poultry Farming", "Sheep & Specialty Livestock Farming", "Vegetable, Fruit & Nut Farming", "Coffee, Tea & Cocoa Farming", "Sugarcane Farming", "Commercial Nurseries", "Commercial Fishing", "Aquaculture", "Fur Farming", "Animal Breeding", "Agriculture Support Services", "Organic Farming", "Animal Feed", "Agricultural Consultancy Services", "Fishing & Farming Wholesale", "Agricultural Biotechnology", "Hog & Pig Farming", "Cattle Farming", "Fair Trade & Ethical Fishing & Farming"] },
      { name: "Food Processing", activities: ["Food Processing (NEC)", "Flour Milling", "Bread & Bakery Product Manufacturing", "Breakfast Cereal Manufacturing", "Cookie, Cracker & Pasta Manufacturing", "Fruit & Vegetable Processing", "Meat Processing", "Halal Meat Processing", "Seafood Product Preparation & Packaging", "Dairy Products", "Starch, Vegetable Fat & Oil Manufacturing", "Coffee & Tea", "Sugar & Artificial Sweeteners", "Chocolate & Confectionery", "Snack Food & Non-Chocolate Confectionary", "Special Foods & Wellbeing Products", "Food Ingredients", "Baby Food", "Ready-Made Meals", "Frozen Food Manufacturing", "Pet Food Manufacturing", "Vegan & Vegetarian Food Manufacturing"] },
      { name: "Tobacco", activities: ["Tobacco (NEC)", "Tobacco Farming", "Tobacco Stemming & Redrying", "Cigars & Cigarette Manufacturing", "Chewing Tobacco Products"] },
    ]
  },
  {
    sector: "Personal & Household Products & Services",
    industries: [
      { name: "Household Products", activities: ["Household Products (NEC)", "Laundry Supplies", "Cleaning Supplies", "Air Fresheners", "Pet & Plant Protection Agents", "Auto Cleaning Products"] },
      { name: "Personal Products", activities: ["Personal Products (NEC)", "Cosmetics & Perfumes", "Luxury Cosmetics", "Sanitary Products", "Hair Accessories", "Birth Control Products", "Halal Personal Products"] },
      { name: "Personal Services", activities: ["Personal Services (NEC)", "Consumer Goods Rental", "Accounting & Tax Preparation", "Personal Legal Services", "Child Care & Family Services", "Consumer Repair Services", "Personal Care Services", "Funeral Services"] },
    ]
  },
  {
    sector: "Food & Drug Retailing",
    industries: [
      { name: "Drug Retailers", activities: ["Drug Retailers (NEC)", "Retail - Drugs with Grocery", "Retail - Drugs without Grocery", "Cannabis Product Retailers", "Non-Cannabis Recreational Drug Retailers"] },
      { name: "Food Retail & Distribution", activities: ["Food Retail & Distribution (NEC)", "Food Wholesale", "Supermarkets & Convenience Stores", "Beer, Wine & Liquor Stores", "Vending Machine Providers", "Tobacco Stores", "Food Markets"] },
    ]
  },
  {
    sector: "Consumer Goods Conglomerates",
    industries: [
      { name: "Consumer Goods Conglomerates", activities: ["Consumer Goods Conglomerates"] },
    ]
  },
  {
    sector: "Banking & Investment Services",
    industries: [
      { name: "Banks", activities: ["Banks (NEC)", "Corporate Banks", "Retail & Mortgage Banks", "Money Center Banks", "Private Banks", "Islamic Banks"] },
      { name: "Consumer Lending", activities: ["Consumer Lending (NEC)", "Personal & Car Loans", "Consumer Credit Cards Services", "Consumer Leasing", "Credit Unions", "Microfinancing"] },
      { name: "Corporate Financial Services", activities: ["Corporate Financial Services (NEC)", "Commercial Loans", "Import-Export Banks", "International Trade Financing", "Factoring", "Commercial Leasing"] },
      { name: "Investment Banking & Brokerage Services", activities: ["Investment Banking & Brokerage Services (NEC)", "Investment Banking", "Brokerage Services", "Inter-Dealer Broker", "Islamic Investment Banking & Brokerage Services", "Merchant Banks"] },
      { name: "Investment Management & Fund Operators", activities: ["Investment Management & Fund Operators (NEC)", "Investment Management", "Hedge Funds", "Collective Investment Fund Operators", "Wealth Management", "Venture Capital", "Private Equity", "Islamic Investment Management & Fund Operators"] },
      { name: "Diversified Investment Services", activities: ["Diversified Investment Services"] },
      { name: "Financial & Commodity Market Operators & Service Providers", activities: ["Financial & Commodity Market Operators & Service Providers (NEC)", "Securities & Commodity Exchanges", "Clearing, Settlement & Custodial Service"] },
    ]
  },
  {
    sector: "Insurance",
    industries: [
      { name: "Multiline Insurance & Brokers", activities: ["Multiline Insurance & Brokers (NEC)", "Islamic Insurance", "Insurance Brokers"] },
      { name: "Property & Casualty Insurance", activities: ["Property & Casualty Insurance (NEC)", "Property Insurance", "Insurance - Automobile", "Travel Insurance", "Casualty Insurance"] },
      { name: "Life & Health Insurance", activities: ["Life & Health Insurance (NEC)", "Life Insurance", "Health Insurance"] },
      { name: "Reinsurance", activities: ["Reinsurance (NEC)", "Life & Health Reinsurance", "Property & Casualty Reinsurance"] },
    ]
  },
  {
    sector: "Collective Investments",
    industries: [
      { name: "UK Investment Trusts", activities: ["UK Investment Trusts"] },
      { name: "Mutual Funds", activities: ["Mutual Funds (NEC)", "Islamic Mutual Funds"] },
      { name: "Closed End Funds", activities: ["Closed End Funds"] },
      { name: "Exchange-Traded Funds", activities: ["Exchange-Traded Funds (NEC)", "Islamic ETFs", "Islamic Commodity ETFs"] },
      { name: "Pension Funds", activities: ["Pension Funds"] },
      { name: "Insurance Funds", activities: ["Insurance Funds"] },
    ]
  },
  {
    sector: "Investment Holding Companies",
    industries: [
      { name: "Investment Holding Companies", activities: ["Investment Holding Companies (NEC)", "Shell Companies"] },
    ]
  },
  {
    sector: "Healthcare Services & Equipment",
    industries: [
      { name: "Advanced Medical Equipment & Technology", activities: ["Advanced Medical Equipment & Technology (NEC)", "Medical Diagnostic & Testing Equipment", "Medical Monitoring Systems", "Laser Equipment", "Medical Imaging Systems", "Medical Software & Technology Services", "Advanced Medical Equipment Wholesale"] },
      { name: "Medical Equipment, Supplies & Distribution", activities: ["Medical Equipment, Supplies & Distribution (NEC)", "Medical Supplies", "Medical Prosthetics", "Medical Equipment", "Medical Devices & Implants", "Medical Equipment Wholesale", "Glasses, Spectacles & Contact Lenses", "Laboratory Diagnostic & Testing Substances", "Veterinary Medical Equipment & Supplies", "Drug Delivery Systems"] },
      { name: "Healthcare Facilities & Services", activities: ["Healthcare Facilities & Services (NEC)", "Hospitals, Clinics & Primary Care Services", "Residential & Long-Term Care", "Ambulance & Emergency Services", "Doctor's Office", "Medical & Diagnostic Laboratories", "Veterinary Services", "Telemedicine Services", "Home Healthcare Services", "Alternative Medicine Facilities", "Medical Farming"] },
      { name: "Managed Healthcare", activities: ["Managed Healthcare (NEC)", "HMO Medical Centers"] },
    ]
  },
  {
    sector: "Pharmaceuticals & Medical Research",
    industries: [
      { name: "Pharmaceuticals", activities: ["Pharmaceuticals (NEC)", "Proprietary & Advanced Pharmaceuticals", "Biopharmaceuticals", "In-Vivo Diagnostic & Testing Substances", "Veterinary Drugs", "Generic Pharmaceuticals", "Alternative Medicine", "Recreational Pharmaceuticals", "Pharmaceuticals Wholesale"] },
      { name: "Biotechnology & Medical Research", activities: ["Biotechnology & Medical Research (NEC)", "Bio Therapeutic Drugs", "Bio Diagnostics & Testing", "Bio Medical Devices"] },
    ]
  },
  {
    sector: "Technology Equipment",
    industries: [
      { name: "Semiconductors", activities: ["Semiconductors (NEC)", "Integrated Circuits", "Memory Chips (RAM)", "Processors", "Semiconductor Wholesale", "NFC & RFID Systems"] },
      { name: "Semiconductor Equipment & Testing", activities: ["Semiconductor Equipment & Testing (NEC)", "Semiconductor Machinery Manufacturing", "Semiconductor Testing Equipment & Service", "Semiconductor Equipment Wholesale"] },
      { name: "Communications & Networking", activities: ["Communications & Networking (NEC)", "Network Equipment", "Security & Surveillance", "Conferencing Tools & Systems", "VOIP Equipment & Systems", "Broadcasting Equipment", "Satellite Communications Network", "Fiber Optic Cable Manufacturing"] },
      { name: "Electronic Equipment & Parts", activities: ["Electronic Equipment & Parts (NEC)", "Biometric Products", "Advanced Electronic Equipment", "Display Screens", "Electronic Components", "3D Printers"] },
      { name: "Office Equipment", activities: ["Office Equipment (NEC)", "Commercial Document Management", "Office Technology Equipment", "Point of Sale Systems", "Scientific & Precision Equipment", "Office Equipment Wholesale"] },
      { name: "Computer Hardware", activities: ["Computer Hardware (NEC)", "Scientific & Super Computers", "Laptop & Desktop Computers", "Tablet & Netbook Computers", "Input Devices", "Output Devices", "Servers & Systems", "Storage Devices", "Computer Hardware Component Assembly", "Consumer Document Management"] },
      { name: "Phones & Handheld Devices", activities: ["Phones & Handheld Devices (NEC)", "Phones & Smart Phones", "Portable Satellite Navigation", "Personal Music Players", "Electronic Books", "Mobile Device Component Assembly"] },
      { name: "Household Electronics", activities: ["Household Electronics (NEC)", "Photographic Equipment", "TV & Video", "Home Audio", "Consumer Electronic Wholesale"] },
      { name: "Integrated Hardware & Software", activities: ["Integrated Hardware & Software"] },
    ]
  },
  {
    sector: "Software & IT Services",
    industries: [
      { name: "IT Services & Consulting", activities: ["IT Services & Consulting (NEC)", "Computer Programming", "Computer Training", "Technology Consulting & Outsourcing Services", "IT Testing Services", "Cloud Computing Services", "Machine Learning & Artificial Intelligence (AI) Services"] },
      { name: "Software", activities: ["Software (NEC)", "System Software", "Application Software", "Enterprise Software", "Mobile Application Software", "Mobile System Software", "Programming Software & Testing Tools", "Server & Database Software", "Security Software"] },
      { name: "Online Services", activities: ["Online Services (NEC)", "Search Engines", "Social Media & Networking", "E-commerce & Auction Services", "Content & Site Management Services", "Internet Security & Transactions Services", "Internet Gaming"] },
    ]
  },
  {
    sector: "Financial Technology (Fintech) & Infrastructure",
    industries: [
      { name: "Financial Technology (Fintech)", activities: ["Financial Technology (Fintech) (NEC)", "Business to Business", "Business to Consumer", "Consumer to Consumer"] },
      { name: "Crowd Collaboration", activities: ["Crowd Collaboration (NEC)", "Crowdfinancing & Crowdfunding", "Crowdsourcing Platforms"] },
      { name: "Blockchain & Cryptocurrency", activities: ["Blockchain & Cryptocurrency (NEC)", "Cryptocurrency Trading Platforms (Exchanges)", "Blockchain Technology (Software)", "Cryptocurrency Hardware", "Cryptocurrency Mining"] },
      { name: "Miscellaneous Fintech Infrastructure", activities: ["Miscellaneous Fintech Infrastructure"] },
    ]
  },
  {
    sector: "Telecommunications Services",
    industries: [
      { name: "Integrated Telecommunications Services", activities: ["Integrated Telecommunications Services (NEC)", "Wired Telecommunications Carriers", "Telecommunications Resellers", "Internet Service Providers", "Telecommunications Network Infrastructure", "VOIP Services"] },
      { name: "Wireless Telecommunications Services", activities: ["Wireless Telecommunications Services (NEC)", "Alternative Communications Services", "Satellite Service Operators", "Wi-Fi & Wi-Max Providers", "Wireless Telecoms Service Providers"] },
    ]
  },
  {
    sector: "Utilities",
    industries: [
      { name: "Electric Utilities", activities: ["Electric Utilities (NEC)", "Fossil Fuel Electric Utilities", "Nuclear Utilities", "Power Charging Stations", "Alternative Electric Utilities", "Hydroelectric & Tidal Utilities", "Solar Electric Utilities", "Wind Electric Utilities", "Biomass & Waste to Energy Electric Utilities", "Geothermal Electric Utilities"] },
      { name: "Independent Power Producers", activities: ["Independent Power Producers (NEC)", "Fossil Fuel IPPs", "Renewable IPPs", "Nuclear IPPs"] },
      { name: "Natural Gas Utilities", activities: ["Natural Gas Utilities (NEC)", "Natural Gas Distribution"] },
      { name: "Water & Related Utilities", activities: ["Water & Related Utilities (NEC)", "Water Supply & Irrigation Systems", "Sewage Treatment Facilities", "Heating & Air-Conditioning Supply"] },
      { name: "Multiline Utilities", activities: ["Multiline Utilities"] },
    ]
  },
  {
    sector: "Real Estate",
    industries: [
      { name: "Real Estate Rental, Development & Operations", activities: ["Real Estate Rental, Development & Operations (NEC)", "Office Real Estate Rental & Development", "Retail Real Estate Rental & Development", "Industrial Real Estate Rental & Development", "Residential Real Estate Rental & Development"] },
      { name: "Real Estate Services", activities: ["Real Estate Services (NEC)", "Office Real Estate Services", "Retail Real Estate Services", "Industrial Real Estate Services", "Residential Real Estate Services"] },
      { name: "Diversified REITs", activities: ["Diversified REITs"] },
      { name: "Commercial REITs", activities: ["Commercial REITs (NEC)", "Office REITs", "Retail REITs", "Industrial REITs"] },
      { name: "Residential REITs", activities: ["Residential REITs"] },
      { name: "Specialized REITs", activities: ["Specialized REITs (NEC)", "Healthcare REITs", "Hospitality REITs", "Self-Storage REITs", "Timber REITs", "Mortgage REITs", "Islamic REITs"] },
    ]
  },
  {
    sector: "Institutions, Associations & Organizations",
    industries: [
      { name: "Religious Organizations", activities: ["Religious Organizations"] },
      { name: "Civic & Social Organizations", activities: ["Civic & Social Organizations"] },
      { name: "Environmental Organizations", activities: ["Environmental Organizations"] },
      { name: "Charity Organizations", activities: ["Charity Organizations"] },
      { name: "Professional Organizations", activities: ["Professional Organizations (NEC)", "Business, Professional & Labor Organizations", "Political Organizations", "Non-Governmental Organizations (NGOs)"] },
    ]
  },
  {
    sector: "Government Activity",
    industries: [
      { name: "Government & Government Finance", activities: ["Government & Government Finance (NEC)", "Public Finance Activities"] },
      { name: "Legal & Safety Public Services", activities: ["Legal & Safety Public Services (NEC)", "Police, Justice & Legal Counsel", "Fire"] },
      { name: "Government Administration Activities", activities: ["Government Administration Activities"] },
      { name: "National Security & International Affairs", activities: ["National Security & International Affairs"] },
    ]
  },
  {
    sector: "Academic & Educational Services",
    industries: [
      { name: "Miscellaneous Educational Service Providers", activities: ["Miscellaneous Educational Service Providers"] },
      { name: "School, College & University", activities: ["School, College & University (NEC)", "Nursery & Pre-Schools", "Elementary & Primary Schools", "Colleges & Secondary Schools", "Universities", "School Districts"] },
      { name: "Professional & Business Education", activities: ["Professional & Business Education"] },
    ]
  },
];

async function main() {
  let sectorCount = 0;
  let industryCount = 0;
  let activityCount = 0;

  for (let si = 0; si < TRBC.length; si += 1) {
    const s = TRBC[si];
    const sector = await prisma.trbcSector.upsert({
      where: { name: s.sector },
      update: { sortOrder: si },
      create: { name: s.sector, sortOrder: si }
    });
    sectorCount += 1;

    for (let ii = 0; ii < s.industries.length; ii += 1) {
      const ind = s.industries[ii];
      const industry = await prisma.trbcIndustry.upsert({
        where: { sectorId_name: { sectorId: sector.id, name: ind.name } },
        update: { sortOrder: ii },
        create: { sectorId: sector.id, name: ind.name, sortOrder: ii }
      });
      industryCount += 1;

      for (let ai = 0; ai < ind.activities.length; ai += 1) {
        const activityName = ind.activities[ai];
        await prisma.trbcActivity.upsert({
          where: { industryId_name: { industryId: industry.id, name: activityName } },
          update: { sortOrder: ai },
          create: { industryId: industry.id, name: activityName, sortOrder: ai }
        });
        activityCount += 1;
      }
    }
  }

  console.log(
    `TRBC seed complete — sectors: ${sectorCount}, industries: ${industryCount}, activities: ${activityCount}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
