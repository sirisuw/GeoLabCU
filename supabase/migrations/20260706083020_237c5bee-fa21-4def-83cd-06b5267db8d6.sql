UPDATE public.rooms
SET 
    code = '325A',
    description_en = 'Computer lab with 12 workstations on the 2nd floor. Door access requires a passcode.',
    location = '2Room325A'
WHERE code = '201' OR code = 'LAB-201' OR description_en = 'Computer lab with 12 workstations on the 3rd floor. Door access requires a passcode.';