import { Router } from 'express';
import { PlaceController } from '../controllers/placeController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';
import {GEOGRAPHY_VERSION,PROVINCES,searchLocations,resolveLocation,locationsWithCatalog} from '../geography/vietnam.js';
import {RegisteredCatalogService} from '../services/registeredCatalogService.js';

const router = Router();
router.get('/locations',async(req,res)=>{
 if(req.query.q!==undefined&&typeof req.query.q!=='string'||req.query.value!==undefined&&typeof req.query.value!=='string'||String(req.query.q||'').length>120){res.status(400).json({success:false,message:'Từ khóa địa điểm không hợp lệ.'});return;}
 let locations=locationsWithCatalog([]),catalogAvailable=true;
 try{locations=locationsWithCatalog(await new RegisteredCatalogService().eligible());}catch{catalogAvailable=false;}
 const value=String(req.query.value||'');res.setHeader('Cache-Control','no-store');res.json({success:true,data:{version:GEOGRAPHY_VERSION,provinceCount:PROVINCES.length,items:searchLocations(String(req.query.q||''),locations),selected:locations.find(g=>g.id===value)||resolveLocation(value)||null,catalogAvailable}});
});

router.get('/', PlaceController.getPlaces);
router.get('/:id', PlaceController.getPlaceById);
router.get('/:id/reviews', PlaceController.getPlaceReviews);
router.post('/:id/reviews', authenticate, requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), PlaceController.addReview);
router.post('/', authenticate, requireRoles('SUPER_ADMIN'), PlaceController.createPlace);
router.delete('/:id', authenticate, requireRoles('SUPER_ADMIN'), PlaceController.deletePlace);

export default router;
